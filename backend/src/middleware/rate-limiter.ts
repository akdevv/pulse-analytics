import rateLimitConfig from "@/config/ratelimit.ts";
import { redis } from "@/config/redis.ts";
import env from "@/config/env.ts";
import rateLimit from "express-rate-limit";
import { type RedisReply, RedisStore } from "rate-limit-redis";
import type { RequestHandler } from "express";

// prefix keeps each limiter in its own redis bucket — otherwise they share a counter
const make = (windowMs: number, max: number, prefix: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      prefix,
      sendCommand: (...args: [string, ...string[]]) =>
        redis.call(...args) as Promise<RedisReply>,
    }),
    message: { status: "error", message: "Too many attempts, try again later" },
  });

const _noopMiddleware: RequestHandler = (_req, _res, next) => next();
const gate = (limiter: RequestHandler): RequestHandler =>
  env.RATE_LIMIT_ENABLED ? limiter : _noopMiddleware;

export const authRateLimit: RequestHandler = gate(
  make(
    rateLimitConfig.auth.windowMs,
    rateLimitConfig.auth.maxAttempts,
    "rl:auth:"
  )
);

// Keyed by user, not IP — a shared office IP shouldn't burn one user's asks,
// and the route is behind authenticateToken so req.user is always set.
export const aiRateLimit: RequestHandler = gate(
  rateLimit({
    windowMs: rateLimitConfig.ai.windowMs,
    max: rateLimitConfig.ai.maxAsks,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.userId ?? "anonymous",
    store: new RedisStore({
      prefix: "rl:ai:",
      sendCommand: (...args: [string, ...string[]]) =>
        redis.call(...args) as Promise<RedisReply>,
    }),
    message: {
      status: "error",
      message: "Too many questions, try again later",
    },
  })
);

export const refreshRateLimit: RequestHandler = gate(
  make(
    rateLimitConfig.refresh.windowMs,
    rateLimitConfig.refresh.maxAttempts,
    "rl:refresh:"
  )
);
