import env from "@/config/env.ts";
import { type ParsedEvent, type RawEvent } from "@/types/event.ts";
import logger from "@/utils/logger.ts";
import { Job, Queue, Worker } from "bullmq";
import { insertManyEvents } from "@/modules/ingestion/track.repository.ts";
import { lookupGeoIp } from "./geo.service.ts";
import { UAParser } from "ua-parser-js";

const connection = {
  host: env.REDIS_HOST || "localhost",
  port: env.REDIS_PORT || 6379,
};

// Dead Letter Queue
const dlq = new Queue("events-failed", {
  connection,
});

// Batch state
let batch: ParsedEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;

const BATCH_SIZE = 100; // flush when we hit 100 events
const FLUSH_INTERVAL_MS = 1000; // flush every 1 second regardless

async function flushBatch(): Promise<void> {
  if (batch.length === 0) return;

  // Grab the current batch and immediately reset
  // This is important: if the DB write takes 50ms, new events
  // should go into the NEXT batch, not pile onto this one
  const toFlush = batch;
  batch = [];

  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  logger.info(`[batcher] flushing ${toFlush.length} events`);

  try {
    await insertManyEvents(toFlush);
  } catch (err) {
    logger.error(
      `[batcher] flush failed for ${toFlush.length} events`,
      err instanceof Error ? err : new Error(String(err))
    );
    // In Phase 8, we just log. Phase 9+ can add retry/DLQ here.
  }
}

function scheduleFlusher() {
  if (flushTimer) return; // already scheduled
  flushTimer = setTimeout(() => {
    flushBatch();
  }, FLUSH_INTERVAL_MS);
}

async function enrichEvent(raw: RawEvent) {
  const uaString = raw.userAgent ?? "";
  const parser = new UAParser(uaString);
  const uaInfo = parser.getResult();

  const geo = await lookupGeoIp(raw.ipAddress);

  console.log("uaInfo => ", uaInfo);
  console.log("geo =>", geo);

  return {
    ...raw,

    // Device info
    browser: uaInfo.browser.name ?? "Unknown",
    browserVersion: uaInfo.browser.version ?? "",
    os: uaInfo.os.name ?? "Unknown",
    osVersion: uaInfo.os.version ?? "",
    deviceType: uaInfo.device.type ?? "desktop",

    // Geo info
    country: geo.country,
    countryCode: geo.countryCode,
    city: geo.city,
    region: geo.region,
  };
}

const worker = new Worker(
  "event",
  async (job: Job<RawEvent>) => {
    const enriched = await enrichEvent(job.data);

    batch.push(enriched);
    logger.debug(`[batcher] batch size now: ${batch.length}`);

    // Flush immediately if we've hit the batch size
    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
    } else {
      //Otherwise, schedule a time-based flush
      scheduleFlusher();
    }
  },
  {
    connection,
    concurrency: 5, // process 5 jobs in parallel
  }
);

worker.on("completed", (job: Job) => {
  logger.info(`[worker] completed: job ${job.id}`);
});

worker.on("failed", async (job: Job | undefined, err: Error) => {
  logger.error(`[worker] failed: job ${job?.id} — ${err.message}`);

  // Only send to DLQ after all retries are exhausted
  const attemptsExhausted = job?.attemptsMade === job?.opts.attempts;

  if (attemptsExhausted && job) {
    logger.warn(`[worker] moving job ${job.id} to DLQ`);

    await dlq.add("failed-event", {
      originalJobId: job.id,
      originalData: job.data,
      failedAt: new Date().toISOString(),
      error: err.message,
      attemptsMade: job.attemptsMade,
    });

    logger.warn(`[worker] job ${job.id} is now in events-failed queue`);
  }
});

worker.on("error", (err: Error) => {
  logger.error(`[worker] worker error: ${err.message}`);
});

logger.info("[worker] Event worker started. Listening for jobs...");

export { worker, flushBatch };
