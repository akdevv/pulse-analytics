import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { validate } from "@/middleware/validate.ts";

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

function makeRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

// ─── validate middleware ───────────────────────────────────────────────────────

describe("validate middleware", () => {
  it("valid body calls next() with no args", () => {
    const req = { body: { name: "alice", age: 30 } } as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("invalid body returns 400 with message and errors", () => {
    const req = { body: { name: 123 } } as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    validate(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Validation error",
        errors: expect.any(Array),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("extra fields allowed by schema pass through", () => {
    const req = { body: { name: "alice", age: 30, extra: "field" } } as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
