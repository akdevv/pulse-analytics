import { prisma } from "@/config/prisma.ts";
import type { OverviewStats, TimeseriesPoint } from "./analytics.types.ts";

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
