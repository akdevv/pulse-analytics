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

const inflight = new Map<string, Promise<CachedSite | null>>();

function siteKey(trackingId: string): string {
  return `site:tid:${trackingId}`;
}

async function fetchAndCache(trackingId: string): Promise<CachedSite | null> {
  const key = siteKey(trackingId);
  const site = await getSiteByTrackingId(trackingId);
  if (site) {
    await redis.setex(key, SITE_CACHE_TTL, JSON.stringify(site));
  }
  return site;
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

    const existing = inflight.get(trackingId);
    if (existing) return existing;

    const promise = fetchAndCache(trackingId).finally(() =>
      inflight.delete(trackingId)
    );
    inflight.set(trackingId, promise);
    return promise;
  } catch (err) {
    // No Postgres fallback. The rate limiter fails closed and the queue is
    // Redis-backed, so with Redis down the event is dropped anyway. A fallback
    // would only add a Postgres query per event during the outage.
    logger.warn("[cache] Redis error, dropping event", { err, trackingId });
    return null;
  }
}

export async function invalidateSiteCache(trackingId: string) {
  const key = siteKey(trackingId);
  await redis.del(key);
  logger.debug("[cache] invalidated", { trackingId });
}
