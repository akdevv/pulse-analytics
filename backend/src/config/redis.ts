import { Redis } from "ioredis";
import env from "@/config/env.ts";
import logger from "@/utils/logger.ts";

const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  ...(env.REDIS_PASSWORD && { password: env.REDIS_PASSWORD }),
  maxRetriesPerRequest: 3,

  // reconnect with backoff, if conn drops
  retryStrategy(times: number) {
    if (times > 10) {
      logger.error("[redis] max reconnection attemps reached");
      return null; // stop retrying
    }
    return Math.min(times * 100, 3000); // wait up to 3s between retries
  },
});

redis.on("connect", () => {
  logger.info("[redis] Redis connected");
});

redis.on("error", (err: Error) => {
  logger.error("[redis] Redis error", err);
});

export { redis };
