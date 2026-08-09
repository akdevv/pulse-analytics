import { describe, it, expect } from "vitest";
import { TrackQuerySchema } from "@/modules/ingestion/track.types.ts";

const validBase = {
  tid: "pk-" + "a".repeat(32),
  t: "PAGEVIEW",
  dl: "https://example.com",
};

// ─── TrackQuerySchema ─────────────────────────────────────────────────────────

describe("TrackQuerySchema", () => {
  it("valid minimal payload passes", () => {
    const result = TrackQuerySchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("invalid tid format fails", () => {
    const result = TrackQuerySchema.safeParse({ ...validBase, tid: "bad-tid" });
    expect(result.success).toBe(false);
  });

  it("invalid t (unknown event type) fails", () => {
    const result = TrackQuerySchema.safeParse({ ...validBase, t: "mouseover" });
    expect(result.success).toBe(false);
  });

  it("invalid dl (not a URL) fails", () => {
    const result = TrackQuerySchema.safeParse({
      ...validBase,
      dl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("invalid cid (not UUID) fails", () => {
    const result = TrackQuerySchema.safeParse({
      ...validBase,
      cid: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("ep JSON string parses to object", () => {
    const result = TrackQuerySchema.safeParse({
      ...validBase,
      ep: JSON.stringify({ key: "value" }),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ep).toEqual({ key: "value" });
    }
  });

  it("malformed ep JSON becomes undefined (no throw)", () => {
    const result = TrackQuerySchema.safeParse({
      ...validBase,
      ep: "{bad json",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ep).toBeUndefined();
    }
  });

  it("valid sr NxN format passes", () => {
    const result = TrackQuerySchema.safeParse({
      ...validBase,
      sr: "1920x1080",
    });
    expect(result.success).toBe(true);
  });

  it("invalid sr format fails", () => {
    const result = TrackQuerySchema.safeParse({
      ...validBase,
      sr: "1920-1080",
    });
    expect(result.success).toBe(false);
  });

  it("valid vp NxN format passes", () => {
    const result = TrackQuerySchema.safeParse({ ...validBase, vp: "375x812" });
    expect(result.success).toBe(true);
  });

  it("ts non-numeric string → undefined", () => {
    const result = TrackQuerySchema.safeParse({
      ...validBase,
      ts: "not-a-number",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ts).toBeUndefined();
    }
  });

  it("debug coerces 'true' → true", () => {
    const result = TrackQuerySchema.safeParse({ ...validBase, debug: "true" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.debug).toBe(true);
    }
  });
});
