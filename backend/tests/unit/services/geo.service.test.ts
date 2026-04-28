import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@maxmind/geoip2-node", () => ({
  Reader: { open: vi.fn() },
}));
vi.mock("@/utils/logger.ts", () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { Reader } from "@maxmind/geoip2-node";

const mockCity = vi.fn();
const mockReader = { city: mockCity };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(Reader.open).mockResolvedValue(mockReader as any);
});

// ─── lookupGeoIp ──────────────────────────────────────────────────────────────

describe("lookupGeoIp", () => {
  it("null IP → returns empty GeoInfo", async () => {
    const { lookupGeoIp } = await import("@/services/geo.service.ts");
    const result = await lookupGeoIp(null);
    expect(result).toEqual({ country: null, countryCode: null, city: null, region: null });
  });

  it("private IP 127.0.0.1 → returns empty", async () => {
    const { lookupGeoIp } = await import("@/services/geo.service.ts");
    const result = await lookupGeoIp("127.0.0.1");
    expect(result).toEqual({ country: null, countryCode: null, city: null, region: null });
    expect(mockCity).not.toHaveBeenCalled();
  });

  it("private IP 10.x.x.x → returns empty", async () => {
    const { lookupGeoIp } = await import("@/services/geo.service.ts");
    const result = await lookupGeoIp("10.0.0.1");
    expect(result).toEqual({ country: null, countryCode: null, city: null, region: null });
  });

  it("private IP 192.168.x.x → returns empty", async () => {
    const { lookupGeoIp } = await import("@/services/geo.service.ts");
    const result = await lookupGeoIp("192.168.1.1");
    expect(result).toEqual({ country: null, countryCode: null, city: null, region: null });
  });

  it("private IP 172.16.x.x → returns empty", async () => {
    const { lookupGeoIp } = await import("@/services/geo.service.ts");
    const result = await lookupGeoIp("172.16.0.1");
    expect(result).toEqual({ country: null, countryCode: null, city: null, region: null });
  });

  it("172.15.x.x → NOT private, reader called", async () => {
    mockCity.mockReturnValue({
      country: { names: { en: "US" }, isoCode: "US" },
      city: { names: { en: "New York" } },
      subdivisions: [{ names: { en: "New York" } }],
    });
    const { lookupGeoIp } = await import("@/services/geo.service.ts");
    const result = await lookupGeoIp("172.15.0.1");
    expect(mockCity).toHaveBeenCalled();
    expect(result.country).toBe("US");
  });

  it("IPv4-mapped IPv6 ::ffff:1.2.3.4 → normalized before lookup", async () => {
    mockCity.mockReturnValue({
      country: { names: { en: "Germany" }, isoCode: "DE" },
      city: { names: { en: "Berlin" } },
      subdivisions: [],
    });
    const { lookupGeoIp } = await import("@/services/geo.service.ts");
    await lookupGeoIp("::ffff:1.2.3.4");
    expect(mockCity).toHaveBeenCalledWith("1.2.3.4");
  });

  it("::ffff:192.168.1.1 → private after normalization, reader not called", async () => {
    const { lookupGeoIp } = await import("@/services/geo.service.ts");
    const result = await lookupGeoIp("::ffff:192.168.1.1");
    expect(result).toEqual({ country: null, countryCode: null, city: null, region: null });
    expect(mockCity).not.toHaveBeenCalled();
  });

  it("public IP + reader loaded → returns populated GeoInfo", async () => {
    mockCity.mockReturnValue({
      country: { names: { en: "United States" }, isoCode: "US" },
      city: { names: { en: "San Francisco" } },
      subdivisions: [{ names: { en: "California" } }],
    });
    const { lookupGeoIp } = await import("@/services/geo.service.ts");
    const result = await lookupGeoIp("8.8.8.8");
    expect(result).toEqual({
      country: "United States",
      countryCode: "US",
      city: "San Francisco",
      region: "California",
    });
  });

  it("public IP + city() throws → returns empty", async () => {
    mockCity.mockImplementation(() => { throw new Error("IP not in database"); });
    const { lookupGeoIp } = await import("@/services/geo.service.ts");
    const result = await lookupGeoIp("5.5.5.5");
    expect(result).toEqual({ country: null, countryCode: null, city: null, region: null });
  });
});
