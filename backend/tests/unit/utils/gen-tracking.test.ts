import { describe, it, expect } from "vitest";
import { generateTrackingId, generateEmbedCode } from "@/utils/gen-tracking.ts";

// ─── generateTrackingId ───────────────────────────────────────────────────────

describe("generateTrackingId", () => {
  it("starts with pk-", () => {
    expect(generateTrackingId()).toMatch(/^pk-/);
  });

  it("total length is 35 chars", () => {
    expect(generateTrackingId()).toHaveLength(35);
  });

  it("matches /^pk-[a-zA-Z0-9_-]{32}$/", () => {
    expect(generateTrackingId()).toMatch(/^pk-[a-zA-Z0-9_-]{32}$/);
  });

  it("returns unique values on repeated calls", () => {
    const ids = new Set(Array.from({ length: 10 }, generateTrackingId));
    expect(ids.size).toBe(10);
  });
});

// ─── generateEmbedCode ────────────────────────────────────────────────────────

describe("generateEmbedCode", () => {
  const trackingId = "pk-" + "a".repeat(32);

  it("contains the trackingId", () => {
    expect(generateEmbedCode(trackingId)).toContain(trackingId);
  });

  it("contains pulse-sdk.js", () => {
    expect(generateEmbedCode(trackingId)).toContain("pulse-sdk.js");
  });

  it("contains window.pulse", () => {
    expect(generateEmbedCode(trackingId)).toContain("window.pulse");
  });
});
