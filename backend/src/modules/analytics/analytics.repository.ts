import { prisma } from "@/config/prisma.ts";
import type {
  OverviewStats,
  TimeseriesPoint,
  PageStat,
  ReferrerStat,
  DeviceStats,
  GeoStat,
  RealtimeStats,
} from "./analytics.types.ts";

export const getSiteForUser = async (siteId: string, userId: string) => {
  const site = await prisma.site.findFirst({
    where: { id: siteId, userId },
  });

  return site;
};

export const getOverview = async (
  siteId: string,
  from: Date,
  to: Date
): Promise<OverviewStats> => {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      COALESCE(SUM(pageviews), 0)::int AS "totalPageviews",
      COALESCE(SUM(sessions),  0)::int AS "totalSessions",
      COALESCE(SUM(visitors),  0)::int AS "totalVisitors"
      FROM daily_pageviews
          WHERE "siteId" = ${siteId}
            AND day >= ${from}
            AND day <  ${to}
    `;
  return rows[0];
};

export const getTimeseries = async (
  siteId: string,
  from: Date,
  to: Date,
  interval: "hour" | "day"
) => {
  if (interval === "hour") {
    return prisma.$queryRaw<TimeseriesPoint[]>`
        SELECT
          bucket::text          AS time,
          SUM(pageviews)::int   AS pageviews,
          SUM(sessions)::int    AS sessions
        FROM hourly_pageviews
        WHERE "siteId" = ${siteId}
          AND bucket >= ${from}
          AND bucket <  ${to}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;
  }

  return prisma.$queryRaw<TimeseriesPoint[]>`
      SELECT
        day::text             AS time,
        SUM(pageviews)::int   AS pageviews,
        SUM(sessions)::int    AS sessions
      FROM daily_pageviews
      WHERE "siteId" = ${siteId}
        AND day >= ${from}
        AND day <  ${to}
      GROUP BY day
      ORDER BY day ASC
    `;
};

export async function getTopPages(
  siteId: string,
  from: Date,
  to: Date,
  limit: number
): Promise<PageStat[]> {
  return prisma.$queryRaw<PageStat[]>`
    SELECT
      page,
      SUM(pageviews)::int AS pageviews
    FROM daily_pageviews
    WHERE "siteId" = ${siteId}
      AND day >= ${from}
      AND day <  ${to}
    GROUP BY page
    ORDER BY pageviews DESC
    LIMIT ${limit}
  `;
}

export async function getReferrers(
  siteId: string,
  from: Date,
  to: Date,
  limit: number
): Promise<ReferrerStat[]> {
  return prisma.$queryRaw<ReferrerStat[]>`
    SELECT
      COALESCE(NULLIF(referrer, ''), 'Direct') AS source,
      COUNT(*)::int                            AS pageviews
    FROM events
    WHERE "siteId"    = ${siteId}
      AND "createdAt" >= ${from}
      AND "createdAt" <  ${to}
      AND "eventType" = 'PAGEVIEW'
    GROUP BY referrer
    ORDER BY pageviews DESC
    LIMIT ${limit}
  `;
}

export async function getDevices(
  siteId: string,
  from: Date,
  to: Date
): Promise<DeviceStats> {
  const [browsers, os, devices] = await Promise.all([
    prisma.$queryRaw<{ browser: string; pageviews: number }[]>`
      SELECT
        COALESCE(browser, 'Unknown') AS browser,
        SUM(pageviews)::int          AS pageviews
      FROM daily_pageviews
      WHERE "siteId" = ${siteId}
        AND day >= ${from}
        AND day <  ${to}
      GROUP BY browser
      ORDER BY pageviews DESC
    `,
    prisma.$queryRaw<{ os: string; pageviews: number }[]>`
      SELECT
        COALESCE(os, 'Unknown') AS os,
        SUM(pageviews)::int     AS pageviews
      FROM daily_pageviews
      WHERE "siteId" = ${siteId}
        AND day >= ${from}
        AND day <  ${to}
      GROUP BY os
      ORDER BY pageviews DESC
    `,
    prisma.$queryRaw<{ device: string; pageviews: number }[]>`
      SELECT
        COALESCE(device, 'Unknown') AS device,
        SUM(pageviews)::int         AS pageviews
      FROM daily_pageviews
      WHERE "siteId" = ${siteId}
        AND day >= ${from}
        AND day <  ${to}
      GROUP BY device
      ORDER BY pageviews DESC
    `,
  ]);

  return { browsers, os, devices };
}

export async function getGeo(
  siteId: string,
  from: Date,
  to: Date
): Promise<GeoStat[]> {
  return prisma.$queryRaw<GeoStat[]>`
    SELECT
      country,
      SUM(pageviews)::int AS pageviews
    FROM daily_pageviews
    WHERE "siteId"  = ${siteId}
      AND day >= ${from}
      AND day <  ${to}
      AND country IS NOT NULL
    GROUP BY country
    ORDER BY pageviews DESC
    LIMIT 20
  `;
}

// Intentionally hits raw events — aggregates are too stale for "right now".
export async function getRealtime(siteId: string): Promise<RealtimeStats> {
  const [sessionRows, pageRows] = await Promise.all([
    prisma.$queryRaw<{ activeSessions: number }[]>`
      SELECT COUNT(DISTINCT "sessionId")::int AS "activeSessions"
      FROM events
      WHERE "siteId"    = ${siteId}
        AND "createdAt" >= NOW() - INTERVAL '5 minutes'
        AND "eventType" = 'PAGEVIEW'
    `,
    prisma.$queryRaw<{ path: string; activeSessions: number }[]>`
      SELECT
        "urlPathname"                          AS path,
        COUNT(DISTINCT "sessionId")::int       AS "activeSessions"
      FROM events
      WHERE "siteId"    = ${siteId}
        AND "createdAt" >= NOW() - INTERVAL '5 minutes'
        AND "eventType" = 'PAGEVIEW'
      GROUP BY "urlPathname"
      ORDER BY "activeSessions" DESC
      LIMIT 5
    `,
  ]);

  return {
    activeSessions: sessionRows[0]?.activeSessions ?? 0,
    activePages: pageRows,
  };
}
