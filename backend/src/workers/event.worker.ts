import { Worker, Job, Queue } from "bullmq";
import { type ParsedEvent } from "@/types/event.ts";
import { insertEvent } from "@/modules/ingestion/track.repository.ts";
import logger from "@/utils/logger.ts";
import env from "@/config/env.ts";

const connection = {
  host: env.REDIS_HOST || "localhost",
  port: env.REDIS_PORT || 6379,
};

// Dead Letter Queue
const dlq = new Queue("events-failed", {
  connection,
});

const worker = new Worker(
  "event",
  async (job: Job<ParsedEvent>) => {
    logger.info(`[worker] picked up job ${job.id}`);

    const start = performance.now();
    await insertEvent(job.data);
    const elapsed = (performance.now() - start).toFixed(2);

    logger.info(`[worker] job ${job.id} done. dbWrite: ${elapsed}ms`);
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

export { worker };
