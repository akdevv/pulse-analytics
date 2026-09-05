import { prisma } from "@/config/prisma.ts";
import type {
  OverviewStats,
  TimeseriesPoint,
  PageStat,
  ReferrerStat,
  DeviceStats,
  GeoStat,
  RealtimeStats,
  EventStat,
  PropertyStat,
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
  const [summaryRows, pageRows, referrerRows, eventRows] = await Promise.all([
    prisma.$queryRaw<
      { activeSessions: number; pageviews: number; visitors: number }[]
    >`
      SELECT
        COUNT(DISTINCT "sessionId")::int  AS "activeSessions",
        COUNT(*)::int                     AS pageviews,
        COUNT(DISTINCT "visitorId")::int  AS visitors
      FROM events
      WHERE "siteId"    = ${siteId}
        AND "receivedAt" >= NOW() - INTERVAL '5 minutes'
        AND "eventType" = 'PAGEVIEW'
    `,
    prisma.$queryRaw<
      { path: string; activeSessions: number; pageviews: number }[]
    >`
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
    prisma.$queryRaw<{ name: string; count: number }[]>`
      SELECT
        "eventName"   AS name,
        COUNT(*)::int AS count
      FROM events
      WHERE "siteId"     = ${siteId}
        AND "receivedAt" >= NOW() - INTERVAL '5 minutes'
        AND "eventType"  <> 'PAGEVIEW'
        AND "eventName"  IS NOT NULL
      GROUP BY "eventName"
      ORDER BY count DESC
      LIMIT 5
    `,
  ]);

  return {
    activeSessions: summaryRows[0]?.activeSessions ?? 0,
    pageviews: summaryRows[0]?.pageviews ?? 0,
    visitors: summaryRows[0]?.visitors ?? 0,
    activePages: pageRows,
    topReferrers: referrerRows,
    events: eventRows,
  };
}

// Raw events, not an aggregate: both continuous aggregates filter on
// eventType = 'PAGEVIEW', so custom events are in neither. Ranges use
// "receivedAt" — the partition column, so chunks are pruned, and the same one
// the aggregates bucket on, so these numbers agree with the pageview cards.
//
// Matches on eventName rather than eventType = 'CUSTOM' because CLICK events
// carry a name too, and excluding them would just hide events.
export async function getCustomEvents(
  siteId: string,
  from: Date,
  to: Date,
  limit: number
): Promise<EventStat[]> {
  return prisma.$queryRaw<EventStat[]>`
    SELECT
      "eventName"                      AS "eventName",
      COUNT(*)::int                    AS count,
      COUNT(DISTINCT "visitorId")::int AS visitors
    FROM events
    WHERE "siteId"     = ${siteId}
      AND "receivedAt" >= ${from}
      AND "receivedAt" <  ${to}
      AND "eventType"  <> 'PAGEVIEW'
      AND "eventName"  IS NOT NULL
    GROUP BY "eventName"
    ORDER BY count DESC
    LIMIT ${limit}
  `;
}

// Counts every (key, value) pair across the event's properties in one query,
// so there is no per-key endpoint.
//
// Values are ranked within their own key and capped at 10 each. A flat
// "top 200 pairs" lets one high-cardinality key (a request id, a timestamp)
// spend the whole budget and hide every other key, which is exactly the
// mistake the docs warn people about. Keys are ordered by total volume, so if
// the outer limit ever bites it drops the least-used key rather than the
// alphabetically unlucky one. Keys tie on volume constantly, since one event
// usually carries the same set every time, so a low-cardinality key sorts
// ahead of a noisy one: three plan values are worth reading, ten request ids
// are not.
//
// Both caps are explicit rather than a bare LIMIT on the flat result. A row
// limit cuts mid-key, so the last key comes back ragged with no way to tell a
// partial list from a complete one. 20 keys x 10 values bounds this at 200
// rows either way.
//
// Do not simplify the CASE away. track.types.ts parses `ep` with a bare
// JSON.parse, so ep=[1,2] lands a non-object in the column and jsonb_each_text
// throws on it. A WHERE guard does not help: the lateral join runs per row
// before WHERE filters, so one bad row anywhere in range fails the query.
export async function getEventProperties(
  siteId: string,
  eventName: string,
  from: Date,
  to: Date
): Promise<PropertyStat[]> {
  return prisma.$queryRaw<PropertyStat[]>`
    SELECT key, value, count, distinct_values AS "distinctValues"
    FROM (
      SELECT
        key, value, count, distinct_values,
        DENSE_RANK() OVER (
          ORDER BY key_total DESC, distinct_values ASC, key ASC
        ) AS key_rank
      FROM (
        SELECT
          prop.key      AS key,
          prop.value    AS value,
          COUNT(*)::int AS count,
          ROW_NUMBER() OVER (
            PARTITION BY prop.key
            ORDER BY COUNT(*) DESC, prop.value ASC
          ) AS value_rank,
          SUM(COUNT(*))      OVER (PARTITION BY prop.key)      AS key_total,
          (COUNT(*)          OVER (PARTITION BY prop.key))::int AS distinct_values
        FROM events e,
          LATERAL jsonb_each_text(
            CASE WHEN jsonb_typeof(e."eventProperties") = 'object'
                 THEN e."eventProperties"
                 ELSE '{}'::jsonb
            END
          ) AS prop(key, value)
        WHERE e."siteId"     = ${siteId}
          AND e."receivedAt" >= ${from}
          AND e."receivedAt" <  ${to}
          AND e."eventName"  = ${eventName}
        GROUP BY prop.key, prop.value
      ) agg
      WHERE value_rank <= 10
    ) ranked
    WHERE key_rank <= 20
    ORDER BY key_rank, count DESC, value ASC
  `;
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
