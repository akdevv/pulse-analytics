import "dotenv/config";
import logger from "@/utils/logger.ts";
import { initGeoIp } from "@/services/geo.service.ts";
import {
  worker,
  flushBatch,
  startThroughputLogger,
} from "@/workers/event.worker.ts";

logger.info("[worker] Worker process started");

await initGeoIp();
startThroughputLogger();

// Flush the in-memory batch before exiting, or those events are lost.
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
