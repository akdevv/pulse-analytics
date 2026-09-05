import { AppError } from "@/utils/app-error.ts";
import { getSiteForUser } from "./analytics.repository.ts";
import { type DateRange, type RealtimeStats } from "./analytics.types.ts";
import * as analyticsRepository from "./analytics.repository.ts";
import { redis } from "@/config/redis.ts";
import logger from "@/utils/logger.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_MS = 7 * DAY_MS;

// The schema only checks that from/to parse as dates, so without this a
// `?from=1900-01-01` scans the whole hypertable. A year is past the retention
// policy, so nothing real is cut off.
const MAX_LOOKBACK_MS = 365 * DAY_MS;

// Defaults to the last 7 days. Clamped to a valid, bounded, non-future window.
export function resolveDateRange(from?: string, to?: string): DateRange {
  const now = Date.now();
  const floor = now - MAX_LOOKBACK_MS;

  const parse = (value: string | undefined): number | undefined => {
    if (!value) return undefined;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  // Future dates return nothing anyway, so clamp to now.
  const to_ = Math.min(parse(to) ?? now, now);
  const from_ = Math.max(parse(from) ?? to_ - DEFAULT_RANGE_MS, floor);

  // A reversed window scans nothing and reads as "no data" instead of bad input.
  const fromDate =
    from_ < to_ ? new Date(from_) : new Date(Math.max(to_ - DEFAULT_RANGE_MS, floor));

  return { fromDate, toDate: new Date(to_) };
}

export const verifySiteOwnership = async (siteId: string, userId: string) => {
  const site = await getSiteForUser(siteId, userId);
  if (!site) {
    throw AppError.forbidden("Site not found or access denied");
  }

  return site;
};

export const getOverview = async (
  siteId: string,
  userId: string,
  from?: string,
  to?: string
) => {
  await verifySiteOwnership(siteId, userId);
  const { fromDate, toDate } = resolveDateRange(from, to);
  return analyticsRepository.getOverview(siteId, fromDate, toDate);
};

export const getTimeseries = async (
  siteId: string,
  userId: string,
  from?: string,
  to?: string,
  interval: "hour" | "day" = "day"
) => {
  await verifySiteOwnership(siteId, userId);
  const { fromDate, toDate } = resolveDateRange(from, to);
  return analyticsRepository.getTimeseries(siteId, fromDate, toDate, interval);
};

export async function getTopPages(
  siteId: string,
  userId: string,
  from?: string,
  to?: string,
  limit: number = 10
) {
  await verifySiteOwnership(siteId, userId);
  const { fromDate, toDate } = resolveDateRange(from, to);
  return analyticsRepository.getTopPages(siteId, fromDate, toDate, limit);
}

export async function getReferrers(
  siteId: string,
  userId: string,
  from?: string,
  to?: string,
  limit: number = 10
) {
  await verifySiteOwnership(siteId, userId);
  const { fromDate, toDate } = resolveDateRange(from, to);
  return analyticsRepository.getReferrers(siteId, fromDate, toDate, limit);
}

export async function getDevices(
  siteId: string,
  userId: string,
  from?: string,
  to?: string
) {
  await verifySiteOwnership(siteId, userId);
  const { fromDate, toDate } = resolveDateRange(from, to);
  return analyticsRepository.getDevices(siteId, fromDate, toDate);
}

export async function getGeo(
  siteId: string,
  userId: string,
  from?: string,
  to?: string
) {
  await verifySiteOwnership(siteId, userId);
  const { fromDate, toDate } = resolveDateRange(from, to);
  return analyticsRepository.getGeo(siteId, fromDate, toDate);
}

export async function getRealtime(siteId: string, userId: string) {
  await verifySiteOwnership(siteId, userId);
  return getCachedRealtime(siteId);
}

// getRealtime fires four raw-hypertable queries, and every open SSE stream
// repeats them every 5 seconds against a pool of five connections. One entry
// per site collapses that however many people watch. The TTL stays under the
// stream interval so the numbers still move at the rate the UI expects.
// ponytail: Redis, since the API runs as more than one container.
const REALTIME_CACHE_TTL_SECONDS = 4;

export async function getCachedRealtime(
  siteId: string
): Promise<RealtimeStats> {
  const key = `realtime:${siteId}`;

  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as RealtimeStats;
  } catch (err) {
    // A cache that is down is not an outage. Fall through to the database.
    logger.warn("[analytics] realtime cache read failed", { err, siteId });
  }

  const fresh = await analyticsRepository.getRealtime(siteId);

  try {
    await redis.setex(key, REALTIME_CACHE_TTL_SECONDS, JSON.stringify(fresh));
  } catch (err) {
    logger.warn("[analytics] realtime cache write failed", { err, siteId });
  }

  return fresh;
}

export async function getCustomEvents(
  siteId: string,
  userId: string,
  from?: string,
  to?: string,
  limit: number = 10
) {
  await verifySiteOwnership(siteId, userId);
  const { fromDate, toDate } = resolveDateRange(from, to);
  return analyticsRepository.getCustomEvents(siteId, fromDate, toDate, limit);
}

export async function getEventProperties(
  siteId: string,
  userId: string,
  eventName: string,
  from?: string,
  to?: string
) {
  await verifySiteOwnership(siteId, userId);
  const { fromDate, toDate } = resolveDateRange(from, to);
  return analyticsRepository.getEventProperties(
    siteId,
    eventName,
    fromDate,
    toDate
  );
}
