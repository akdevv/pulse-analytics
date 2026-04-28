import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/config/redis.ts", () => ({
  redis: { get: vi.fn(), setex: vi.fn(), del: vi.fn() },
}));
vi.mock("@/modules/ingestion/track.repository.ts", () => ({
  getSiteByTrackingId: vi.fn(),
}));
vi.mock("@/utils/logger.ts", () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { redis } from "@/config/redis.ts";
import { getSiteByTrackingId } from "@/modules/ingestion/track.repository.ts";
import { getCachedSite, invalidateSiteCache } from "@/modules/ingestion/track.cache.ts";

const mockSite = {
  id: "site-1",
  domain: "example.com",
  rateLimitTier: "FREE" as const,
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getCachedSite ────────────────────────────────────────────────────────────

describe("getCachedSite", () => {
  it("cache HIT → returns parsed site, does NOT call getSiteByTrackingId", async () => {
    vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockSite));

    const result = await getCachedSite("pk-hit");

    expect(result).toEqual(mockSite);
    expect(getSiteByTrackingId).not.toHaveBeenCalled();
  });

  it("cache MISS → calls getSiteByTrackingId, stores in Redis, returns site", async () => {
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(getSiteByTrackingId).mockResolvedValue(mockSite as any);
    vi.mocked(redis.setex).mockResolvedValue("OK");

    const result = await getCachedSite("pk-miss");

    expect(getSiteByTrackingId).toHaveBeenCalledWith("pk-miss");
    expect(redis.setex).toHaveBeenCalled();
    expect(result).toEqual(mockSite);
  });

  it("cache MISS, site not found → does NOT call setex, returns null", async () => {
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(getSiteByTrackingId).mockResolvedValue(null);

    const result = await getCachedSite("pk-notfound");

    expect(redis.setex).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("concurrent MISS → getSiteByTrackingId called only once", async () => {
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.setex).mockResolvedValue("OK");

    let resolveDb!: (v: typeof mockSite) => void;
    vi.mocked(getSiteByTrackingId).mockReturnValue(
      new Promise((resolve) => { resolveDb = resolve; }) as any
    );

    const p1 = getCachedSite("pk-concurrent");
    const p2 = getCachedSite("pk-concurrent");

    resolveDb(mockSite);
    await Promise.all([p1, p2]);

    expect(getSiteByTrackingId).toHaveBeenCalledTimes(1);
  });

  it("Redis error → falls back to getSiteByTrackingId", async () => {
    vi.mocked(redis.get).mockRejectedValue(new Error("redis down"));
    vi.mocked(getSiteByTrackingId).mockResolvedValue(mockSite as any);

    const result = await getCachedSite("pk-rederror");

    expect(getSiteByTrackingId).toHaveBeenCalledWith("pk-rederror");
    expect(result).toEqual(mockSite);
  });
});

// ─── invalidateSiteCache ──────────────────────────────────────────────────────

describe("invalidateSiteCache", () => {
  it("calls redis.del with correct key", async () => {
    vi.mocked(redis.del).mockResolvedValue(1);

    await invalidateSiteCache("pk-abc");

    expect(redis.del).toHaveBeenCalledWith("site:tid:pk-abc");
  });
});
