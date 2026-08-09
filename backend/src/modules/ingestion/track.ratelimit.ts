import { redis } from "@/config/redis.ts";
import rateLimitConfig, { type Tier } from "@/config/ratelimit.ts";
import logger from "@/utils/logger.ts";

function siteRateLimitKey(siteId: string): string {
  const currentMinute = Math.floor(Date.now() / 60000);
  return `rateLimit:site:${siteId}:${currentMinute}`;
}

function ipRateLimitKey(ip: string): string {
  const currentMinute = Math.floor(Date.now() / 60000);
  return `rateLimit:ip:${ip}:${currentMinute}`;
}

export async function checkSiteRateLimit(
  siteId: string,
  tier: Tier = "FREE"
): Promise<{ allowed: boolean; reason?: string }> {
  if (!rateLimitConfig.enabled) return { allowed: true };

  const key = siteRateLimitKey(siteId);
  const limit = rateLimitConfig.siteLimits[tier];

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, rateLimitConfig.keyTtlSeconds);
    }

    if (count > limit) {
      logger.warn("[ratelimit] site limit exceeded", {
        siteId,
        count,
        limit,
        tier,
      });
      return { allowed: false, reason: "site_rate_limit_exceeded" };
    }

    return { allowed: true };
  } catch (err) {
    logger.error(
      "[ratelimit] Redis error — rejecting request (fail-closed)",
      err instanceof Error ? err : new Error(String(err))
    );
    return { allowed: false, reason: "rate_limit_unavailable" };
  }
}

export async function checkIpRateLimit(
  ip: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (!rateLimitConfig.enabled) return { allowed: true };

  const key = ipRateLimitKey(ip);
  const limit = rateLimitConfig.ipLimit;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, rateLimitConfig.keyTtlSeconds);
    }

    if (count > limit) {
      logger.warn("[ratelimit] IP limit exceeded", { ip, count, limit });
      return { allowed: false, reason: "ip_rate_limit_exceeded" };
    }

    return { allowed: true };
  } catch (err) {
    logger.error(
      "[ratelimit] Redis error — rejecting request (fail-closed)",
      err instanceof Error ? err : new Error(String(err))
    );
    return { allowed: false, reason: "rate_limit_unavailable" };
  }
}
