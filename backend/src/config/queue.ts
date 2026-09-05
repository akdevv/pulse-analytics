import env from "@/config/env.ts";
import { Queue } from "bullmq";
import { type RawEvent } from "@/types/event.ts";

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};

export const eventQueue = new Queue("event", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 1000, // job count, not seconds
    removeOnFail: 5000, // kept for inspection
  },
});

export async function enqueue(event: RawEvent): Promise<void> {
  await eventQueue.add("track", event);
}
