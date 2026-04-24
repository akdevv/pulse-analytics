const rateLimitConfig = {
  enabled: true,

  // Per-site limits (events per minute, per tier)
  siteLimits: {
    FREE: 1_000,
    PRO: 10_000,
    ENTERPRISE: 100_000,
  },

  // Per-IP limit (events per minute, across all sites)
  ipLimit: 500,

  // Redis key TTL in seconds (should be > 60 to survive clock skew)
  keyTtlSeconds: 120,

  // Auth endpoint limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 10,
  },
} as const;

export type Tier = keyof typeof rateLimitConfig.siteLimits;

export default rateLimitConfig;
