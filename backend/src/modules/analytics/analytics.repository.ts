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
      FROM hourly_pageviews
          WHERE "siteId" = ${siteId}
            AND bucket >= ${from}
            AND bucket <  ${to}
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
      "urlPathname"       AS page,
      SUM(pageviews)::int AS pageviews
    FROM hourly_pageviews
    WHERE "siteId" = ${siteId}
      AND bucket >= ${from}
      AND bucket <  ${to}
    GROUP BY "urlPathname"
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
      SUM(pageviews)::int                      AS pageviews
    FROM hourly_pageviews
    WHERE "siteId" = ${siteId}
      AND bucket >= ${from}
      AND bucket <  ${to}
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
      FROM hourly_pageviews
      WHERE "siteId" = ${siteId}
        AND bucket >= ${from}
        AND bucket <  ${to}
      GROUP BY browser
      ORDER BY pageviews DESC
    `,
    prisma.$queryRaw<{ os: string; pageviews: number }[]>`
      SELECT
        COALESCE(os, 'Unknown') AS os,
        SUM(pageviews)::int     AS pageviews
      FROM hourly_pageviews
      WHERE "siteId" = ${siteId}
        AND bucket >= ${from}
        AND bucket <  ${to}
      GROUP BY os
      ORDER BY pageviews DESC
    `,
    prisma.$queryRaw<{ device: string; pageviews: number }[]>`
      SELECT
        COALESCE("deviceType", 'Unknown') AS device,
        SUM(pageviews)::int               AS pageviews
      FROM hourly_pageviews
      WHERE "siteId" = ${siteId}
        AND bucket >= ${from}
        AND bucket <  ${to}
      GROUP BY "deviceType"
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
    FROM hourly_pageviews
    WHERE "siteId"  = ${siteId}
      AND bucket >= ${from}
      AND bucket <  ${to}
      AND country IS NOT NULL
    GROUP BY country
    ORDER BY pageviews DESC
    LIMIT 20
  `;
}

// Intentionally hits raw events — aggregates are too stale for "right now".
export async function getRealtime(siteId: string): Promise<RealtimeStats> {
  const [summaryRows, pageRows, referrerRows] = await Promise.all([
    prisma.$queryRaw<{ activeSessions: number; pageviews: number; visitors: number }[]>`
      SELECT
        COUNT(DISTINCT "sessionId")::int  AS "activeSessions",
        COUNT(*)::int                     AS pageviews,
        COUNT(DISTINCT "visitorId")::int  AS visitors
      FROM events
      WHERE "siteId"    = ${siteId}
        AND "receivedAt" >= NOW() - INTERVAL '5 minutes'
        AND "eventType" = 'PAGEVIEW'
    `,
    prisma.$queryRaw<{ path: string; activeSessions: number; pageviews: number }[]>`
      SELECT
        "urlPathname"                          AS path,
        COUNT(DISTINCT "sessionId")::int       AS "activeSessions",
        COUNT(*)::int                          AS pageviews
      FROM events
      WHERE "siteId"    = ${siteId}
        AND "receivedAt" >= NOW() - INTERVAL '5 minutes'
        AND "eventType" = 'PAGEVIEW'
      GROUP BY "urlPathname"
      ORDER BY "activeSessions" DESC
      LIMIT 5
    `,
    prisma.$queryRaw<{ referrer: string | null; activeSessions: number }[]>`
      SELECT
        NULLIF("referrer", '')                 AS referrer,
        COUNT(DISTINCT "sessionId")::int       AS "activeSessions"
      FROM events
      WHERE "siteId"    = ${siteId}
        AND "receivedAt" >= NOW() - INTERVAL '5 minutes'
        AND "eventType" = 'PAGEVIEW'
      GROUP BY NULLIF("referrer", '')
      ORDER BY "activeSessions" DESC
      LIMIT 5
    `,
  ]);

  return {
    activeSessions: summaryRows[0]?.activeSessions ?? 0,
    pageviews: summaryRows[0]?.pageviews ?? 0,
    visitors: summaryRows[0]?.visitors ?? 0,
    activePages: pageRows,
    topReferrers: referrerRows,
  };
}

export async function getRawEvents(siteId: string) {
  return prisma.$queryRaw<any[]>`
    SELECT *
    FROM events
    WHERE "siteId" = ${siteId}
    ORDER BY "receivedAt" DESC
    LIMIT 10
  `;
}

export async function performRawQuery(query: string) {
  return prisma.$queryRawUnsafe<any[]>(query);
}
