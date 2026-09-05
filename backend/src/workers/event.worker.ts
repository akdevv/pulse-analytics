import env from "@/config/env.ts";
import { eventQueue } from "@/config/queue.ts";
import { type ParsedEvent, type RawEvent } from "@/types/event.ts";
import logger from "@/utils/logger.ts";
import { Job, Queue, Worker } from "bullmq";
import { insertManyEvents } from "@/modules/ingestion/track.repository.ts";
import { lookupGeoIp } from "@/services/geo.service.ts";
import { UAParser } from "ua-parser-js";

const QUEUE_DEPTH_WARN_THRESHOLD = 10_000;

const uaCache = new Map<string, UAParser.IResult>();

function parseUA(ua: string): UAParser.IResult {
  const cached = uaCache.get(ua);
  if (cached) return cached;
  const result = new UAParser(ua).getResult();
  if (uaCache.size >= 5_000) uaCache.clear();
  uaCache.set(ua, result);
  return result;
}

const connection = {
  host: env.REDIS_HOST || "localhost",
  port: env.REDIS_PORT || 6379,
};

const dlq = new Queue("events-failed", {
  connection,
});

let batch: ParsedEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let processedInLastMinute = 0;

const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 1000;

// Held in memory during a database outage. Past this the oldest are
// quarantined, so a long outage cannot exhaust the heap.
const MAX_PENDING = 10 * BATCH_SIZE;

// Rows Postgres will never accept, however often they are offered. Everything
// else (connection refused, pool timeout, disk full) is transient and worth a retry.
const PERMANENT_PRISMA_CODES = new Set([
  "P2000", // value too long for the column
  "P2002", // unique constraint
  "P2003", // foreign key constraint
  "P2005", // invalid value stored for the field type
  "P2006", // invalid value provided
  "P2007", // data validation error
]);

const isPermanentWriteError = (err: unknown): boolean => {
  if (err instanceof Error && err.name === "PrismaClientValidationError") {
    return true;
  }
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" && PERMANENT_PRISMA_CODES.has(code);
};

// One row at a time, so a poison row can be told apart from its batch mates.
async function isolateAndQuarantine(rows: ParsedEvent[]): Promise<number> {
  let rescued = 0;

  for (const row of rows) {
    try {
      await insertManyEvents([row]);
      rescued++;
    } catch (err) {
      logger.error(
        "[batcher] event rejected by the database, moving to DLQ",
        err instanceof Error ? err : new Error(String(err)),
        { siteId: row.siteId, eventId: row.eventId }
      );
      await dlq.add("rejected-event", {
        originalData: row,
        failedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
        reason: "database rejected the row",
      });
    }
  }

  return rescued;
}

async function flushBatch(): Promise<void> {
  if (batch.length === 0) return;

  // Reset before awaiting, so events arriving mid-write join the next batch.
  const toFlush = batch;
  batch = [];

  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const batchSize = toFlush.length;
  const flushStart = performance.now();

  try {
    await insertManyEvents(toFlush);
    processedInLastMinute += batchSize;
    const flushTime = (performance.now() - flushStart).toFixed(2);
    logger.info(
      `[worker] Batch flushed. count: ${batchSize}, time: ${flushTime}ms`
    );

    const [waiting, active] = await Promise.all([
      eventQueue.getWaitingCount(),
      eventQueue.getActiveCount(),
    ]);

    logger.info(
      `[worker] Queue depth — waiting: ${waiting}, active: ${active}`
    );

    if (waiting > QUEUE_DEPTH_WARN_THRESHOLD) {
      logger.warn(`[worker] Queue backlog is high`, {
        waiting,
        active,
        hint: "Worker may not be keeping up with ingestion rate",
      });
    }
  } catch (err) {
    logger.error(
      `[batcher] flush failed for ${toFlush.length} events`,
      err instanceof Error ? err : new Error(String(err))
    );

    // A permanently bad row must not go back on the pile. Its job was already
    // acknowledged, so nothing would ever remove it and every flush would fail.
    if (isPermanentWriteError(err)) {
      const rescued = await isolateAndQuarantine(toFlush);
      processedInLastMinute += rescued;
      logger.warn("[batcher] isolated a failed batch", {
        total: toFlush.length,
        rescued,
        quarantined: toFlush.length - rescued,
      });
      return;
    }

    // Transient. Keep the events and retry on a timer, not just on the next job.
    batch = [...toFlush, ...batch];

    if (batch.length > MAX_PENDING) {
      const overflow = batch.splice(0, batch.length - MAX_PENDING);
      logger.error(
        "[batcher] pending batch over the ceiling, quarantining the oldest",
        null,
        { quarantined: overflow.length, retained: batch.length }
      );
      for (const row of overflow) {
        await dlq.add("overflow-event", {
          originalData: row,
          failedAt: new Date().toISOString(),
          error: "pending batch exceeded MAX_PENDING during a database outage",
          reason: "batcher overflow",
        });
      }
    }

    scheduleFlusher();
  }
}

function scheduleFlusher() {
  if (flushTimer) return; // already scheduled
  flushTimer = setTimeout(() => {
    flushBatch();
  }, FLUSH_INTERVAL_MS);
}

export async function enrichEvent(raw: RawEvent) {
  const uaString = raw.userAgent ?? "";
  const uaInfo = parseUA(uaString);

  // Destructured out, not nulled. ParsedEvent has no field for it.
  const { ipAddress, ...rest } = raw;
  const geo = await lookupGeoIp(ipAddress);

  return {
    ...rest,

    browser: uaInfo.browser.name ?? "Unknown",
    browserVersion: uaInfo.browser.version ?? "",
    os: uaInfo.os.name ?? "Unknown",
    osVersion: uaInfo.os.version ?? "",
    deviceType: uaInfo.device.type ?? "desktop",

    country: geo.country,
    countryCode: geo.countryCode,
    city: geo.city,
    region: geo.region,
  };
}

export function startThroughputLogger(): void {
  setInterval(() => {
    logger.info(
      `[worker] Throughput — events processed in last 60s: ${processedInLastMinute}`
    );
    processedInLastMinute = 0;
  }, 60_000);
}

const worker = new Worker(
  "event",
  async (job: Job<RawEvent>) => {
    const enriched = await enrichEvent(job.data);

    batch.push(enriched);
    logger.debug(`[batcher] batch size now: ${batch.length}`);

    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
    } else {
      scheduleFlusher();
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

worker.on("failed", async (job: Job | undefined, err: Error) => {
  logger.error(`[worker] failed: job ${job?.id} — ${err.message}`);

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
