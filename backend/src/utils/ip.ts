import type { Request } from "express";

// req.ip, never X-Forwarded-For directly. Express walks that header inward by
// the "trust proxy" hop count set in app.ts, so entries a client prepended are
// skipped. Reading the header here would let a client pick its own rate-limit key.
export function extractClientIp(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}
