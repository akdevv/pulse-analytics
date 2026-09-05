import { describe, it, expect } from "vitest";
import type { Request } from "express";
import { extractClientIp } from "@/utils/ip.ts";

function makeReq(opts: { forwardedFor?: string; ip?: string; remote?: string } = {}): Request {
  return {
    headers: opts.forwardedFor ? { "x-forwarded-for": opts.forwardedFor } : {},
    ip: opts.ip,
    socket: { remoteAddress: opts.remote },
  } as unknown as Request;
}

describe("extractClientIp", () => {
  it("uses req.ip, which Express derives from the trust proxy setting", () => {
    expect(extractClientIp(makeReq({ ip: "9.9.9.9" }))).toBe("9.9.9.9");
  });

  // The /track IP rate limiter keys on this, so trusting the header's first
  // entry would be a one-header bypass of the anti-abuse control.
  it("ignores a spoofed X-Forwarded-For prefix", () => {
    const req = makeReq({ forwardedFor: "1.2.3.4, 5.6.7.8", ip: "9.9.9.9" });
    expect(extractClientIp(req)).toBe("9.9.9.9");
  });

  it("falls back to the socket when req.ip is unset", () => {
    expect(extractClientIp(makeReq({ remote: "10.0.0.1" }))).toBe("10.0.0.1");
  });

  it("returns unknown when nothing identifies the peer", () => {
    expect(extractClientIp(makeReq())).toBe("unknown");
  });
});
