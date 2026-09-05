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
  // Raw events, not hourly_pageviews. The rollup's sessions and visitors are
  // distinct counts within a group, so summing them counts one visitor once
  // per page they viewed. ponytail: a range-bounded scan on the
  // (siteId, timestamp) index. If it ever hurts, use approximate distincts
  // (Toolkit hyperloglog), not sums of exact counts.
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      COUNT(*)                          ::int AS "totalPageviews",
      COUNT(DISTINCT "sessionId")       ::int AS "totalSessions",
      COUNT(DISTINCT "visitorId")       ::int AS "totalVisitors"
    FROM events
    WHERE "siteId" = ${siteId}
      AND "eventType" = 'PAGEVIEW'
      AND "receivedAt" >= ${from}
      AND "receivedAt" <  ${to}
    `;
  return rows[0];
};

export const getTimeseries = async (
  siteId: string,
  from: Date,
  to: Date,
  interval: "hour" | "day"
) => {
  // pageviews would sum correctly from the rollup, sessions would not (see
  // getOverview). Both read raw events so the chart's two lines agree.
  const bucket = interval === "hour" ? "1 hour" : "1 day";

  return prisma.$queryRaw<TimeseriesPoint[]>`
      SELECT
        time_bucket(${bucket}::interval, "receivedAt")::text AS time,
        COUNT(*)::int                                        AS pageviews,
        COUNT(DISTINCT "sessionId")::int                     AS sessions
      FROM events
      WHERE "siteId" = ${siteId}
        AND "eventType" = 'PAGEVIEW'
        AND "receivedAt" >= ${from}
        AND "receivedAt" <  ${to}
      GROUP BY 1
      ORDER BY 1 ASC
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
    -- Group by the expression, not the raw column. Grouping by the plain
    -- referrer column put NULL and the empty string in separate buckets that
    -- both rendered as "Direct", so the dashboard showed that row twice with
    -- the traffic split between the two.
    GROUP BY 1
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

// Raw events. The aggregates are too stale for "right now".
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

// Raw events. Both continuous aggregates filter on eventType = 'PAGEVIEW', so
// custom events are in neither. Ranges use "receivedAt", the partition column,
// so chunks prune and these numbers agree with the pageview cards. Matches on
// eventName, not eventType = 'CUSTOM', since CLICK events carry names too.
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

// Every (key, value) pair in one query. Values rank within their own key and
// cap at 10, keys order by volume. A flat "top 200 pairs" would let one
// high-cardinality key (a request id) spend the whole budget and hide the
// rest. Two explicit caps also avoid a row limit cutting a key mid-list.
//
// Keep the CASE. track.types.ts parses `ep` with a bare JSON.parse, so ep=[1,2]
// lands a non-object and jsonb_each_text throws. A WHERE guard cannot help:
// the lateral join runs per row before WHERE, so one bad row fails the query.
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
