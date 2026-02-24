import { redis } from "@/config/redis.ts";
import logger from "@/utils/logger.ts";

const RATE_LIMITS = {
  FREE: 1000,
  PRO: 10_000,
  ENTERPRISE: 100_000,
};
const IP_RATE_LIMIT = 500;

type Tier = keyof typeof RATE_LIMITS;

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
): Promise<boolean> {
  const key = siteRateLimitKey(siteId);
  const limit = RATE_LIMITS[tier];

  try {
    const count = await redis.incr(key);

    // first increment - set TTL so key cleans itself
    if (count === 1) {
      await redis.expire(key, 120); // 2 mins
    }

    if (count > limit) {
      logger.warn("[ratelimit] site limit exceeded", {
        siteId,
        count,
        limit,
        tier,
      });
      return false;
    }

    return true;
  } catch (err) {
    // Redis down — fail open (allow the request)
    // Better to let traffic through than to block everything
    logger.warn("[ratelimit] Redis error, allowing all requests.", {
      err,
      siteId,
    });
    return true;
  }
}

export async function checkIpRateLimit(ip: string): Promise<boolean> {
  const key = ipRateLimitKey(ip);

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, 120); // 2 mins
    }

    if (count > IP_RATE_LIMIT) {
      logger.warn("[ratelimit] IP limit exceeded", {
        ip,
        count,
        limit: IP_RATE_LIMIT,
      });
      return false;
    }

    return true;
  } catch (err) {
    logger.warn("[ratelimit] Redis error, allowing request", { err, ip });
    return true;
  }
}
