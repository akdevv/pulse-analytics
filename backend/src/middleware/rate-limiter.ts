import rateLimitConfig from "@/config/ratelimit.ts";
import { redis } from "@/config/redis.ts";
import env from "@/config/env.ts";
import rateLimit from "express-rate-limit";
import { type RedisReply, RedisStore } from "rate-limit-redis";
import type { RequestHandler } from "express";

// prefix: without it every limiter shares one redis counter
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

// Keyed by user, not IP. A shared office IP should not burn one user's asks.
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

// Deployment-wide daily ceiling. One fixed key, so all instances share it.
// ponytail: fixed window from the first ask, not rolling 24h. Worst case is a
// quiet day then a double-rate day across the boundary. Sliding window if so.
export const aiGlobalRateLimit: RequestHandler = gate(
  rateLimit({
    windowMs: rateLimitConfig.ai.globalWindowMs,
    max: rateLimitConfig.ai.globalMaxAsks,
    standardHeaders: false,
    legacyHeaders: false,
    keyGenerator: () => "global",
    store: new RedisStore({
      prefix: "rl:ai:global:",
      sendCommand: (...args: [string, ...string[]]) =>
        redis.call(...args) as Promise<RedisReply>,
    }),
    message: {
      status: "error",
      message: "The demo's daily question budget is spent. Try again tomorrow.",
    },
  })
);

// No model call, but getConversation replays stored SQL on a 2-connection pool.
export const aiReadRateLimit: RequestHandler = gate(
  rateLimit({
    windowMs: rateLimitConfig.ai.readWindowMs,
    max: rateLimitConfig.ai.maxReads,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.userId ?? "anonymous",
    store: new RedisStore({
      prefix: "rl:ai:read:",
      sendCommand: (...args: [string, ...string[]]) =>
        redis.call(...args) as Promise<RedisReply>,
    }),
    message: { status: "error", message: "Too many requests, slow down" },
  })
);

// In-memory, unlike every other limiter here. /health reports a Redis outage,
// so a Redis-backed store would turn an informative 503 into an opaque 500.
export const healthRateLimit: RequestHandler = gate(
  rateLimit({
    windowMs: rateLimitConfig.health.windowMs,
    max: rateLimitConfig.health.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "error", message: "Too many requests, slow down" },
  })
);

export const refreshRateLimit: RequestHandler = gate(
  make(
    rateLimitConfig.refresh.windowMs,
    rateLimitConfig.refresh.maxAttempts,
    "rl:refresh:"
  )
);
