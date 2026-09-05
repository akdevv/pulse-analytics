import env from "@/config/env.ts";
import type { GeoInfo } from "@/types/event.ts";
import logger from "@/utils/logger.ts";
import { Reader, ReaderModel } from "@maxmind/geoip2-node";
import path from "path";

let reader: ReaderModel | null = null;
// Without this, a missing database makes Reader.open retry and log on every
// event the worker enriches. One attempt, one log line, then geo stays empty.
let readerFailed = false;

const geoCache = new Map<string, GeoInfo>();
const GEO_CACHE_MAX_SIZE = 10_000;

async function getReader() {
  if (reader) return reader;
  if (readerFailed) return null;

  try {
    const dbPath = path.resolve(env.GEOIP_DB_PATH);
    reader = await Reader.open(dbPath);
    logger.info("[GeoIP] Database loaded successfully");
    return reader;
  } catch (err) {
    readerFailed = true;
    logger.error(
      "[GeoIP] Failed to load database — geo lookups will be skipped",
      err instanceof Error ? err : new Error(String(err))
    );
    return null;
  }
}

export async function initGeoIp(): Promise<void> {
  await getReader();
}

export async function lookupGeoIp(ipAddress: string | null): Promise<GeoInfo> {
  const empty: GeoInfo = {
    country: null,
    countryCode: null,
    city: null,
    region: null,
  };

  if (!ipAddress) return empty;
  const ip = normalizeIp(ipAddress);

  if (isPrivateIp(ip)) {
    logger.debug(`[GeoIP] Skipping private IP: ${ip}`);
    return empty;
  }

  const cached = geoCache.get(ip);
  if (cached) {
    logger.debug(`[GeoIP] Cache HIT for ${ip}`);
    return cached;
  }

  logger.debug(`[GeoIP] Cache MISS for ${ip}`);

  const db = await getReader();
  if (!db) return empty;

  try {
    const res = db.city(ip);

    const result: GeoInfo = {
      country: res.country?.names?.en ?? null,
      countryCode: res.country?.isoCode ?? null,
      city: res.city?.names?.en ?? null,
      region: res.subdivisions?.[0]?.names?.en ?? null,
    };

    if (geoCache.size >= GEO_CACHE_MAX_SIZE) {
      logger.info(
        `[GeoIP] Cache full (${GEO_CACHE_MAX_SIZE} entries), clearing`
      );
      geoCache.clear();
    }
    geoCache.set(ip, result);

    return result;
  } catch (err) {
    // MaxMind throws when the IP is not in the database. Treat as unknown.
    logger.debug(`[GeoIP] No data for IP ${ip}: ${err}`);
    return empty;
  }
}

function normalizeIp(ip: string): string {
  // Docker and some proxies send IPv4 as ::ffff:192.168.1.1
  if (ip.startsWith("::ffff:")) {
    return ip.slice(7);
  }
  return ip;
}

const PRIVATE_172 = /^172\.(1[6-9]|2\d|3[01])\./;

function isPrivateIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    PRIVATE_172.test(ip)
  );
}
