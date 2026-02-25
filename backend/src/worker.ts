import "dotenv/config";
import logger from "@/utils/logger.ts";
import { worker, flushBatch } from "@/workers/event.worker.ts";

logger.info("[worker] Worker process started");

// Graceful shutdown — when you Ctrl+C, finish current jobs before exiting
process.on("SIGTERM", async () => {
  logger.info("[worker] SIGTERM received, closing worker...");
  await flushBatch();
  await worker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("[worker] SIGINT received, closing worker...");
  await flushBatch();
  await worker.close();
  process.exit(0);
});
