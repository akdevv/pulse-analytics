import rateLimitConfig from "@/config/ratelimit.ts";
import { redis } from "@/config/redis.ts";
import env from "@/config/env.ts";
import rateLimit from "express-rate-limit";
import { type RedisReply, RedisStore } from "rate-limit-redis";
import type { RequestHandler } from "express";

const _authRateLimit = rateLimit({
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

const _noopMiddleware: RequestHandler = (_req, _res, next) => next();

export const authRateLimit: RequestHandler = env.RATE_LIMIT_ENABLED
  ? _authRateLimit
  : _noopMiddleware;
