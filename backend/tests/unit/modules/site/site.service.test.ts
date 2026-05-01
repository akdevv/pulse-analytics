import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/site/site.repository.ts", () => ({
  findSiteByDomain: vi.fn(),
  createSite: vi.fn(),
  getSiteById: vi.fn(),
  getSites: vi.fn(),
  updateSite: vi.fn(),
  deleteSite: vi.fn(),
  updateTrackingId: vi.fn(),
}));
vi.mock("@/modules/ingestion/track.cache.ts", () => ({
  invalidateSiteCache: vi.fn(),
}));
vi.mock("@/utils/gen-tracking.ts", () => ({
  generateTrackingId: vi.fn(),
  generateEmbedCode: vi.fn(),
}));

import * as repo from "@/modules/site/site.repository.ts";
import { invalidateSiteCache } from "@/modules/ingestion/track.cache.ts";
import { generateTrackingId, generateEmbedCode } from "@/utils/gen-tracking.ts";
import {
  createSiteService,
  getSiteByIdService,
  updateSiteService,
  deleteSiteService,
  regenerateTrackingIdService,
} from "@/modules/site/site.service.ts";

const mockSite = {
  id: "site-1",
  name: "My Site",
  domain: "example.com",
  userId: "user-1",
  trackingId: "pk-" + "a".repeat(29),
  rateLimitTier: "FREE" as const,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createSiteService ────────────────────────────────────────────────────────

describe("createSiteService", () => {
  it("domain already exists → throws AppError(409)", async () => {
    vi.mocked(repo.findSiteByDomain).mockResolvedValue(mockSite);

    await expect(
      createSiteService({
        userId: "user-1",
        name: "My Site",
        domain: "example.com",
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("new domain → calls generateTrackingId, createSite, returns site and embedCode", async () => {
    vi.mocked(repo.findSiteByDomain).mockResolvedValue(null);
    vi.mocked(generateTrackingId).mockReturnValue("pk-new-tid");
    vi.mocked(generateEmbedCode).mockReturnValue("<script>embed</script>");
    vi.mocked(repo.createSite).mockResolvedValue(mockSite);

    const result = await createSiteService({
      userId: "user-1",
      name: "My Site",
      domain: "example.com",
    });

    expect(generateTrackingId).toHaveBeenCalled();
    expect(repo.createSite).toHaveBeenCalled();
    expect(result).toHaveProperty("site");
    expect(result).toHaveProperty("embedCode");
  });

  it("embedCode contains the generated trackingId", async () => {
    vi.mocked(repo.findSiteByDomain).mockResolvedValue(null);
    vi.mocked(generateTrackingId).mockReturnValue("pk-new-tid");
    vi.mocked(generateEmbedCode).mockReturnValue("embed-pk-new-tid");
    vi.mocked(repo.createSite).mockResolvedValue(mockSite);

    const result = await createSiteService({
      userId: "user-1",
      name: "My Site",
      domain: "example.com",
    });

    expect(result.embedCode).toContain("pk-new-tid");
  });
});

// ─── getSiteByIdService ───────────────────────────────────────────────────────

describe("getSiteByIdService", () => {
  it("site not found → throws AppError(404)", async () => {
    vi.mocked(repo.getSiteById).mockResolvedValue(null);

    await expect(getSiteByIdService("user-1", "site-x")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("site found → returns site", async () => {
    vi.mocked(repo.getSiteById).mockResolvedValue(mockSite);

    const result = await getSiteByIdService("user-1", "site-1");

    expect(result).toEqual(mockSite);
  });
});

// ─── updateSiteService ────────────────────────────────────────────────────────

describe("updateSiteService", () => {
  it("site not owned by user → throws AppError(404)", async () => {
    vi.mocked(repo.getSiteById).mockResolvedValue(null);

    await expect(
      updateSiteService("user-1", "site-x", { name: "New Name" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("new domain already taken → throws AppError(409)", async () => {
    vi.mocked(repo.getSiteById).mockResolvedValue(mockSite);
    vi.mocked(repo.findSiteByDomain).mockResolvedValue({
      ...mockSite,
      id: "other-site",
    });

    await expect(
      updateSiteService("user-1", "site-1", { domain: "taken.com" })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("same domain (no change) → skips domain conflict check", async () => {
    vi.mocked(repo.getSiteById).mockResolvedValue(mockSite);
    vi.mocked(repo.updateSite).mockResolvedValue(mockSite);

    await updateSiteService("user-1", "site-1", { domain: "example.com" });

    expect(repo.findSiteByDomain).not.toHaveBeenCalled();
  });

  it("valid update → returns updated site", async () => {
    const updated = { ...mockSite, name: "New Name" };
    vi.mocked(repo.getSiteById).mockResolvedValue(mockSite);
    vi.mocked(repo.updateSite).mockResolvedValue(updated);

    const result = await updateSiteService("user-1", "site-1", {
      name: "New Name",
    });

    expect(result).toEqual(updated);
  });
});

// ─── deleteSiteService ────────────────────────────────────────────────────────

describe("deleteSiteService", () => {
  it("site not found → throws AppError(404)", async () => {
    vi.mocked(repo.getSiteById).mockResolvedValue(null);

    await expect(deleteSiteService("user-1", "site-x")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("found → calls deleteSite then invalidateSiteCache", async () => {
    vi.mocked(repo.getSiteById).mockResolvedValue(mockSite);
    vi.mocked(repo.deleteSite).mockResolvedValue(undefined as never);
    vi.mocked(invalidateSiteCache).mockResolvedValue(undefined);

    await deleteSiteService("user-1", "site-1");

    expect(repo.deleteSite).toHaveBeenCalledWith("user-1", "site-1");
    expect(invalidateSiteCache).toHaveBeenCalledWith(mockSite.trackingId);
  });
});

// ─── regenerateTrackingIdService ──────────────────────────────────────────────

describe("regenerateTrackingIdService", () => {
  it("site not found → throws AppError(404)", async () => {
    vi.mocked(repo.getSiteById).mockResolvedValue(null);

    await expect(
      regenerateTrackingIdService("user-1", "site-x")
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("found → invalidates old cache, generates new trackingId, returns site and embedCode", async () => {
    const newSite = { ...mockSite, trackingId: "pk-new-tid" };
    vi.mocked(repo.getSiteById).mockResolvedValue(mockSite);
    vi.mocked(invalidateSiteCache).mockResolvedValue(undefined);
    vi.mocked(generateTrackingId).mockReturnValue("pk-new-tid");
    vi.mocked(generateEmbedCode).mockReturnValue("embed-pk-new-tid");
    vi.mocked(repo.updateTrackingId).mockResolvedValue(newSite);

    const result = await regenerateTrackingIdService("user-1", "site-1");

    expect(invalidateSiteCache).toHaveBeenCalledWith(mockSite.trackingId);
    expect(generateTrackingId).toHaveBeenCalled();
    expect(result.site).toEqual(newSite);
    expect(result.embedCode).toContain("pk-new-tid");
  });
});
