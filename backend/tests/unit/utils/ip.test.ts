import { describe, it, expect } from "vitest";
import type { Request } from "express";
import { extractClientIp } from "@/utils/ip.ts";

function makeReq(forwardedFor?: string, ip?: string): Request {
  return {
    headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {},
    ip,
  } as unknown as Request;
}

// ─── extractClientIp ──────────────────────────────────────────────────────────

describe("extractClientIp", () => {
  it("returns first IP from x-forwarded-for (comma-separated)", () => {
    const req = makeReq("1.2.3.4, 5.6.7.8, 9.10.11.12");
    expect(extractClientIp(req)).toBe("1.2.3.4");
  });

  it("trims whitespace from x-forwarded-for value", () => {
    const req = makeReq("  1.2.3.4  , 5.6.7.8");
    expect(extractClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to req.ip when header absent", () => {
    const req = makeReq(undefined, "9.9.9.9");
    expect(extractClientIp(req)).toBe("9.9.9.9");
  });

  it("returns unknown when both header and req.ip are missing", () => {
    const req = makeReq(undefined, undefined);
    expect(extractClientIp(req)).toBe("unknown");
  });
});
