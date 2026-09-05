import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/config/prisma.ts";
import * as AnalyticsService from "@/modules/analytics/analytics.service.ts";
import { dbReachable } from "./db.ts";

// The unit suite mocks the repository, so it asserts query strings and proves
// nothing about what Postgres returns. The visitor overcount below passed every
// mocked test: the overview summed the rollup's per-group COUNT(DISTINCT
// visitorId), so one visitor reading three pages counted as three.

const online = await dbReachable();
const suite = online ? describe : describe.skip;
if (!online) {
  console.warn("[integration] no database reachable — skipping");
}

const ownerId = `it-owner-${randomUUID()}`;
const strangerId = `it-stranger-${randomUUID()}`;
const siteId = randomUUID();

const VISITORS = 3;
const PAGES = ["/a", "/b", "/c"];
const BROWSERS = ["Chrome", "Firefox", "Safari"];

suite("analytics against a real database", () => {
  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: ownerId, name: "Owner", email: `${ownerId}@test.local`, password: "x" },
        { id: strangerId, name: "Stranger", email: `${strangerId}@test.local`, password: "x" },
      ],
    });
    await prisma.site.create({
      data: {
        id: siteId,
        userId: ownerId,
        name: "Integration Site",
        domain: `${siteId}.test`,
        trackingId: `pk-${randomUUID().replace(/-/g, "")}`,
      },
    });

    // Every visitor hits every page in a different browser: 3 x 3 = 9 rollup
    // groups holding one visitor each, the shape that breaks a summed distinct.
    const now = new Date();
    await prisma.event.createMany({
      data: Array.from({ length: VISITORS }).flatMap((_, v) =>
        PAGES.map((page, p) => ({
          siteId,
          eventId: randomUUID(),
          eventType: "PAGEVIEW" as const,
          url: `https://it.test${page}`,
          urlHostname: "it.test",
          urlPathname: page,
          sessionId: `00000000-0000-4000-8000-${String(v).padStart(12, "0")}`,
          visitorId: `00000000-0000-4000-9000-${String(v).padStart(12, "0")}`,
          browser: BROWSERS[p]!,
          browserVersion: "1",
          os: "macOS",
          osVersion: "1",
          deviceType: "desktop",
          timestamp: now,
          receivedAt: now,
        }))
      ),
    });
  });

  afterAll(async () => {
    await prisma.$executeRaw`DELETE FROM events WHERE "siteId" = ${siteId}::text`;
    await prisma.site.deleteMany({ where: { id: siteId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, strangerId] } } });
    await prisma.$disconnect();
  });

  it("counts each visitor once, however many pages they read", async () => {
    const overview = await AnalyticsService.getOverview(siteId, ownerId);

    expect(overview.totalPageviews).toBe(VISITORS * PAGES.length);
    expect(overview.totalVisitors).toBe(VISITORS);
    expect(overview.totalSessions).toBe(VISITORS);
  });

  it("agrees with the timeseries it sits above", async () => {
    const overview = await AnalyticsService.getOverview(siteId, ownerId);
    const series = await AnalyticsService.getTimeseries(siteId, ownerId);

    const pageviews = series.reduce((n, point) => n + point.pageviews, 0);
    expect(pageviews).toBe(overview.totalPageviews);
    // Distinct counts only sum within one bucket, and everything is in one hour.
    expect(series.every((point) => point.sessions <= VISITORS)).toBe(true);
  });

  it("still sums the plain counts correctly per page", async () => {
    const pages = await AnalyticsService.getTopPages(siteId, ownerId);
    expect(pages).toHaveLength(PAGES.length);
    for (const page of pages) expect(page.pageviews).toBe(VISITORS);
  });

  it("refuses a site the requester does not own", async () => {
    await expect(
      AnalyticsService.getOverview(siteId, strangerId)
    ).rejects.toMatchObject({ statusCode: 403 });

    await expect(
      AnalyticsService.getTopPages(siteId, strangerId)
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
