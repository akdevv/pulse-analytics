import { Redis } from "ioredis";
import env from "@/config/env.ts";
import logger from "@/utils/logger.ts";

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  ...(env.REDIS_PASSWORD && { password: env.REDIS_PASSWORD }),
  maxRetriesPerRequest: 3,

  // linear backoff capped at 3s, give up after 10 attempts
  retryStrategy(times) {
    if (times > 10) {
      logger.error("[redis] max reconnection attempts reached");
      return null;
    }
    return Math.min(times * 100, 3000);
  },
});

redis.on("connect", () => logger.info("[redis] connected"));
redis.on("error", (err: Error) => logger.error("[redis] error", err));
