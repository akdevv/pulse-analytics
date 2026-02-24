import { redis } from "@/config/redis.ts";
import logger from "@/utils/logger.ts";
import { getSiteByTrackingId } from "./track.repository.ts";
import type { RateLimitTier } from "@/generated/prisma/enums.ts";

interface CachedSite {
  id: string;
  domain: string;
  rateLimitTier: RateLimitTier;
  isActive: boolean;
}

const SITE_CACHE_TTL = 300; // 5 mins

function siteKey(trackingId: string): string {
  return `site:tid:${trackingId}`;
}

export async function getCachedSite(
  trackingId: string
): Promise<CachedSite | null> {
  const key = siteKey(trackingId);

  try {
    const cached = await redis.get(key);

    if (cached) {
      logger.debug("[cache] HIT");
      return JSON.parse(cached);
    }

    logger.debug("[cache] MISS", { trackingId });

    const site = await getSiteByTrackingId(trackingId);
    if (site) {
      await redis.setex(key, SITE_CACHE_TTL, JSON.stringify(site));
    }

    return site;
  } catch (err) {
    // if redis is down, fallback to DB
    logger.warn("[cache] Redis error, falling back to DB", { err, trackingId });
    return getSiteByTrackingId(trackingId);
  }
}

export async function invalidateSiteCache(trackingId: string) {
  const key = siteKey(trackingId);
  await redis.del(key);
  logger.debug("[cache] invalidated", { trackingId });
}
