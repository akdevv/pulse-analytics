import rateLimitConfig from "@/config/ratelimit.ts";
import { redis } from "@/config/redis.ts";
import rateLimit from "express-rate-limit";
import { type RedisReply, RedisStore } from "rate-limit-redis";

export const authRateLimit = rateLimit({
  windowMs: rateLimitConfig.auth.windowMs,
  max: rateLimitConfig.auth.maxAttempts,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: [string, ...string[]]) =>
      redis.call(...args) as Promise<RedisReply>,
  }),
  message: { status: "error", message: "Too many attempts, try again later" },
});
