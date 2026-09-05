import { describe, it, expect } from "vitest";
import { generateTrackingId } from "@/utils/gen-tracking.ts";

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

