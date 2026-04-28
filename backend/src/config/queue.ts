import env from "@/config/env.ts";
import { Queue } from "bullmq";
import { type RawEvent } from "@/types/event.ts";
import logger from "@/utils/logger.ts";

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};

export const eventQueue = new Queue("event", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 1000, // keep last 1000 completed jobs in Redis
    removeOnFail: 5000, // keep last 5000 failed jobs for inspection
  },
});

export async function enqueue(event: RawEvent): Promise<void> {
  await eventQueue.add("track", event);
  logger.info("[queue] event enqueued");
}
