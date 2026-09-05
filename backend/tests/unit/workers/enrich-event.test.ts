import { describe, it, expect, vi, beforeEach } from "vitest";

// The worker builds a BullMQ Worker and Queue at import time, so everything it
// reaches for is stubbed before the import below.
vi.mock("bullmq", () => ({
  Worker: class {
    on() {}
  },
  Queue: class {
    add = vi.fn();
    getWaitingCount = vi.fn().mockResolvedValue(0);
    getActiveCount = vi.fn().mockResolvedValue(0);
  },
  Job: class {},
}));
vi.mock("@/config/queue.ts", () => ({
  eventQueue: {
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
  },
}));
vi.mock("@/utils/logger.ts", () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/modules/ingestion/track.repository.ts", () => ({
  insertManyEvents: vi.fn(),
}));
vi.mock("@/services/geo.service.ts", () => ({
  lookupGeoIp: vi.fn(),
}));

import { enrichEvent } from "@/workers/event.worker.ts";
import { lookupGeoIp } from "@/services/geo.service.ts";
import { EventType, type RawEvent } from "@/types/event.ts";

const GEO = {
  country: "India",
  countryCode: "IN",
  city: "Mumbai",
  region: "Maharashtra",
};

function makeRaw(overrides: Partial<RawEvent> = {}): RawEvent {
  return {
    siteId: "site-1",
    eventId: "event-1",
    eventType: EventType.PAGEVIEW,
    eventName: null,
    url: "https://example.test/",
    urlHostname: "example.test",
    urlPathname: "/",
    urlSearch: null,
    pageTitle: null,
    referrer: null,
    sessionId: null,
    visitorId: null,
    ipAddress: "203.0.113.42",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    screenResolution: null,
    viewportSize: null,
    userLanguage: null,
    timestamp: new Date(),
    receivedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(lookupGeoIp).mockResolvedValue(GEO);
});

describe("enrichEvent", () => {
  // Keeps the docs' "collects nothing that identifies a person" claim true.
  it("does not carry the IP address through to the stored event", async () => {
    const enriched = await enrichEvent(makeRaw());
    expect(enriched.ipAddress).toBeNull();
  });

  it("still resolves geo from the real IP before dropping it", async () => {
    const enriched = await enrichEvent(makeRaw());

    expect(lookupGeoIp).toHaveBeenCalledWith("203.0.113.42");
    expect(enriched.country).toBe("India");
    expect(enriched.city).toBe("Mumbai");
  });

  it("handles an event that arrived without an IP", async () => {
    vi.mocked(lookupGeoIp).mockResolvedValue({
      country: null,
      countryCode: null,
      city: null,
      region: null,
    });

    const enriched = await enrichEvent(makeRaw({ ipAddress: null }));

    expect(enriched.ipAddress).toBeNull();
    expect(enriched.country).toBeNull();
  });

  it("keeps the non-identifying enrichment it is there to add", async () => {
    const enriched = await enrichEvent(makeRaw());

    expect(enriched.browser).toBe("Chrome");
    expect(enriched.os).toBe("macOS");
    expect(enriched.deviceType).toBe("desktop");
    expect(enriched.siteId).toBe("site-1");
  });
});
