import env from "@/config/env.ts";

const rateLimitConfig = {
  enabled: env.RATE_LIMIT_ENABLED,

  // How many events per minute each site can send, based on their plan
  siteLimits: {
    FREE: 1_000,
    PRO: 10_000,
    ENTERPRISE: 100_000,
  },

  // Hard cap per IP regardless of which site they're hitting
  ipLimit: 500,

  // Keep keys alive a bit longer than a minute to survive clock skew
  keyTtlSeconds: 120,

  // Stricter limits for login/register — slow down brute force attempts
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 10,
  },
} as const;

export type Tier = keyof typeof rateLimitConfig.siteLimits;

export default rateLimitConfig;
