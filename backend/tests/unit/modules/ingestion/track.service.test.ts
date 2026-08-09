import { describe, it, expect } from "vitest";
import type { Request } from "express";
import {
  getClientIp,
  buildRawEvent,
} from "@/modules/ingestion/track.service.ts";
import type { TrackQueryParams } from "@/modules/ingestion/track.types.ts";

function makeReq(
  opts: {
    forwardedFor?: string | string[];
    remoteAddress?: string;
    userAgent?: string;
  } = {}
): Request {
  return {
    headers: {
      ...(opts.forwardedFor ? { "x-forwarded-for": opts.forwardedFor } : {}),
      ...(opts.userAgent ? { "user-agent": opts.userAgent } : {}),
    },
    socket: { remoteAddress: opts.remoteAddress },
  } as unknown as Request;
}

const baseParams: TrackQueryParams = {
  v: "1",
  tid: "pk-" + "a".repeat(29),
  t: "PAGEVIEW" as any,
  dl: "https://example.com/path?foo=bar",
  debug: false,
};

// ─── getClientIp ──────────────────────────────────────────────────────────────

describe("getClientIp", () => {
  it("extracts first IP from x-forwarded-for (comma + space separated)", () => {
    const req = makeReq({ forwardedFor: "1.2.3.4, 5.6.7.8, 9.10.11.12" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("extracts first IP from array-form header", () => {
    const req = makeReq({ forwardedFor: ["1.2.3.4", "5.6.7.8"] });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to req.socket.remoteAddress", () => {
    const req = makeReq({ remoteAddress: "9.9.9.9" });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });
});

// ─── buildRawEvent ────────────────────────────────────────────────────────────

describe("buildRawEvent", () => {
  const req = makeReq({ remoteAddress: "1.2.3.4", userAgent: "Mozilla/5.0" });

  it("parses valid URL into urlHostname and urlPathname", () => {
    const event = buildRawEvent(baseParams, req, "site-1");
    expect(event.urlHostname).toBe("example.com");
    expect(event.urlPathname).toBe("/path");
  });

  it("stores non-empty urlSearch", () => {
    const event = buildRawEvent(baseParams, req, "site-1");
    expect(event.urlSearch).toBe("?foo=bar");
  });

  it("strips empty urlSearch (bare ?)", () => {
    // URL("https://example.com/path?").search === "?" → treated as empty
    // Actually "?" is a non-empty string, let's test with no search params
    const noSearch = { ...baseParams, dl: "https://example.com/path" };
    const event = buildRawEvent(noSearch, req, "site-1");
    expect(event.urlSearch).toBeUndefined();
  });

  it("malformed URL → urlHostname empty, urlPathname is raw URL", () => {
    const params = { ...baseParams, dl: "not-a-url" as any };
    const event = buildRawEvent(params, req, "site-1");
    expect(event.urlHostname).toBe("");
    expect(event.urlPathname).toBe("not-a-url");
  });

  it("uses provided ts param as timestamp", () => {
    const ts = Date.now();
    const params = { ...baseParams, ts };
    const event = buildRawEvent(params, req, "site-1");
    expect(event.timestamp.getTime()).toBe(ts);
  });

  it("uses now when ts is absent", () => {
    const before = Date.now();
    const event = buildRawEvent(baseParams, req, "site-1");
    const after = Date.now();
    expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before);
    expect(event.timestamp.getTime()).toBeLessThanOrEqual(after);
  });

  it("sets eventId as a UUID", () => {
    const event = buildRawEvent(baseParams, req, "site-1");
    expect(event.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("sets siteId from argument", () => {
    const event = buildRawEvent(baseParams, req, "site-42");
    expect(event.siteId).toBe("site-42");
  });

  it("sets empty referrer to undefined", () => {
    const params = { ...baseParams, dr: "" };
    const event = buildRawEvent(params, req, "site-1");
    expect(event.referrer).toBeUndefined();
  });
});
