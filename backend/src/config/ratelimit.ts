import env from "@/config/env.ts";

const rateLimitConfig = {
  enabled: env.RATE_LIMIT_ENABLED,

  // events per minute, per site
  siteLimits: {
    FREE: 1_000,
    PRO: 10_000,
    ENTERPRISE: 100_000,
  },

  // events per minute, per IP, across all sites
  ipLimit: 500,

  // longer than the 1-minute bucket, so a key outlives its own window
  keyTtlSeconds: 120,

  // login/register, to slow brute force
  auth: {
    windowMs: 15 * 60 * 1000,
    maxAttempts: 10,
  },

  // Each ask costs one or two free-tier LLM requests, so these limit
  // availability as much as abuse.
  ai: {
    windowMs: 60 * 60 * 1000,
    maxAsks: 30,

    // Global across all users. The provider's free tier is one shared daily
    // allowance, so per-user limits alone do not bound it.
    globalWindowMs: 24 * 60 * 60 * 1000,
    globalMaxAsks: 500,

    // Opening a thread re-runs its stored SQL, holding one of the AI pool's
    // two connections for up to 5s. Not a free read.
    readWindowMs: 60 * 1000,
    maxReads: 60,
  },

  // Unauthenticated, and each call costs a Postgres query, a Redis ping and
  // three queue counts. Set well above any load balancer's poll rate.
  health: {
    windowMs: 60 * 1000,
    maxRequests: 60,
  },

  // /refresh needs a valid signed cookie, so this only stops a runaway
  // client looping on 401s.
  refresh: {
    windowMs: 15 * 60 * 1000,
    maxAttempts: 100,
  },
} as const;

export type Tier = keyof typeof rateLimitConfig.siteLimits;

export default rateLimitConfig;
