import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/analytics/analytics.repository.ts", () => ({
  getSiteForUser: vi.fn(),
  getOverview: vi.fn(),
  getTimeseries: vi.fn(),
  getTopPages: vi.fn(),
  getReferrers: vi.fn(),
  getDevices: vi.fn(),
  getGeo: vi.fn(),
  getRealtime: vi.fn(),
}));

import * as analyticsRepo from "@/modules/analytics/analytics.repository.ts";
import {
  resolveDateRange,
  verifySiteOwnership,
  getOverview,
  getTimeseries,
  getTopPages,
  getReferrers,
  getDevices,
  getGeo,
  getRealtime,
} from "@/modules/analytics/analytics.service.ts";

const mockSite = { id: "site-1", userId: "user-1", domain: "example.com" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveDateRange", () => {
  it("no args → toDate ≈ now, fromDate ≈ 7 days ago", () => {
    const before = Date.now();
    const { fromDate, toDate } = resolveDateRange();
    const after = Date.now();

    expect(toDate.getTime()).toBeGreaterThanOrEqual(before);
    expect(toDate.getTime()).toBeLessThanOrEqual(after);

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(
      Math.abs(toDate.getTime() - fromDate.getTime() - sevenDaysMs)
    ).toBeLessThan(100);
  });

  it("custom from/to strings → correct Date objects", () => {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const range = resolveDateRange(from.toISOString(), to.toISOString());
    expect(range.fromDate).toEqual(from);
    expect(range.toDate).toEqual(to);
  });

  // The schema checks only that the date parses, so an unclamped ?from is a
  // full hypertable scan from any signed-in account.
  it("clamps a from date beyond the lookback ceiling", () => {
    const { fromDate } = resolveDateRange("1900-01-01");
    const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    expect(Math.abs(fromDate.getTime() - yearAgo)).toBeLessThan(1000);
  });

  it("clamps a to date in the future back to now", () => {
    const { toDate } = resolveDateRange(undefined, "2999-01-01");
    expect(Math.abs(toDate.getTime() - Date.now())).toBeLessThan(1000);
  });

  // A reversed window scans nothing and reads as "no data", not as bad input.
  it("falls back to the default span when from is after to", () => {
    const { fromDate, toDate } = resolveDateRange(
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    );
    expect(fromDate.getTime()).toBeLessThan(toDate.getTime());
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(
      Math.abs(toDate.getTime() - fromDate.getTime() - sevenDaysMs)
    ).toBeLessThan(1000);
  });

  it("ignores an unparseable date rather than producing Invalid Date", () => {
    const { fromDate, toDate } = resolveDateRange("not-a-date", "also-bad");
    expect(Number.isNaN(fromDate.getTime())).toBe(false);
    expect(Number.isNaN(toDate.getTime())).toBe(false);
  });
});

describe("verifySiteOwnership", () => {
  it("site found → returns site", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(mockSite as any);

    const result = await verifySiteOwnership("site-1", "user-1");

    expect(result).toEqual(mockSite);
  });

  it("site not found → throws AppError(403)", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(null);

    await expect(verifySiteOwnership("site-x", "user-1")).rejects.toMatchObject(
      {
        statusCode: 403,
      }
    );
  });
});

describe("getOverview", () => {
  it("calls verifySiteOwnership first, then delegates to repository", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(mockSite as any);
    vi.mocked(analyticsRepo.getOverview).mockResolvedValue({} as any);

    await getOverview("site-1", "user-1");

    expect(analyticsRepo.getSiteForUser).toHaveBeenCalledWith(
      "site-1",
      "user-1"
    );
    expect(analyticsRepo.getOverview).toHaveBeenCalled();
  });

  it("unauthorized user → throws 403 before hitting repository", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(null);

    await expect(getOverview("site-x", "user-1")).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(analyticsRepo.getOverview).not.toHaveBeenCalled();
  });
});

describe("getTimeseries", () => {
  it("calls verifySiteOwnership and delegates to repository", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(mockSite as any);
    vi.mocked(analyticsRepo.getTimeseries).mockResolvedValue([] as any);

    await getTimeseries("site-1", "user-1");

    expect(analyticsRepo.getTimeseries).toHaveBeenCalled();
  });

  it("unauthorized user → throws 403", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(null);
    await expect(getTimeseries("site-x", "user-1")).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

describe("getTopPages", () => {
  it("calls verifySiteOwnership and delegates to repository", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(mockSite as any);
    vi.mocked(analyticsRepo.getTopPages).mockResolvedValue([] as any);

    await getTopPages("site-1", "user-1");

    expect(analyticsRepo.getTopPages).toHaveBeenCalled();
  });

  it("unauthorized user → throws 403", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(null);
    await expect(getTopPages("site-x", "user-1")).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

describe("getReferrers", () => {
  it("calls verifySiteOwnership and delegates to repository", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(mockSite as any);
    vi.mocked(analyticsRepo.getReferrers).mockResolvedValue([] as any);

    await getReferrers("site-1", "user-1");

    expect(analyticsRepo.getReferrers).toHaveBeenCalled();
  });

  it("unauthorized user → throws 403", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(null);
    await expect(getReferrers("site-x", "user-1")).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

describe("getDevices", () => {
  it("calls verifySiteOwnership and delegates to repository", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(mockSite as any);
    vi.mocked(analyticsRepo.getDevices).mockResolvedValue({} as any);

    await getDevices("site-1", "user-1");

    expect(analyticsRepo.getDevices).toHaveBeenCalled();
  });

  it("unauthorized user → throws 403", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(null);
    await expect(getDevices("site-x", "user-1")).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

describe("getGeo", () => {
  it("calls verifySiteOwnership and delegates to repository", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(mockSite as any);
    vi.mocked(analyticsRepo.getGeo).mockResolvedValue([] as any);

    await getGeo("site-1", "user-1");

    expect(analyticsRepo.getGeo).toHaveBeenCalled();
  });

  it("unauthorized user → throws 403", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(null);
    await expect(getGeo("site-x", "user-1")).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

describe("getRealtime", () => {
  it("calls verifySiteOwnership and delegates to repository", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(mockSite as any);
    vi.mocked(analyticsRepo.getRealtime).mockResolvedValue({} as any);

    await getRealtime("site-1", "user-1");

    expect(analyticsRepo.getRealtime).toHaveBeenCalled();
  });

  it("unauthorized user → throws 403", async () => {
    vi.mocked(analyticsRepo.getSiteForUser).mockResolvedValue(null);
    await expect(getRealtime("site-x", "user-1")).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
