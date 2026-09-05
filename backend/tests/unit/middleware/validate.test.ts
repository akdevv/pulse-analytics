import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { validate, ValidationError } from "@/middleware/validate.ts";

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

describe("validate middleware", () => {
  it("valid body calls next() with no args", () => {
    const req = { body: { name: "alice", age: 30 } } as Request;
    const next = vi.fn() as unknown as NextFunction;

    validate(schema)(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  // Without this, a schema transform is decoration: "  Example.COM " reached
  // the database untouched and became a second row beside "example.com".
  it("writes the parsed value back to req.body", () => {
    const transforming = z.object({
      domain: z.string().transform((v) => v.trim().toLowerCase()),
    });
    const req = { body: { domain: "  Example.COM  " } } as Request;
    const next = vi.fn() as unknown as NextFunction;

    validate(transforming)(req, makeRes(), next);

    expect(req.body).toEqual({ domain: "example.com" });
    expect(next).toHaveBeenCalledWith();
  });

  it("strips keys the schema does not describe", () => {
    const req = { body: { name: "alice", age: 30, extra: "field" } } as Request;
    const next = vi.fn() as unknown as NextFunction;

    validate(schema)(req, makeRes(), next);

    expect(req.body).toEqual({ name: "alice", age: 30 });
  });

  // Forwarded, not answered here, so it shares the standard error envelope.
  it("invalid body forwards a ValidationError carrying the field errors", () => {
    const req = { body: { name: 123 } } as Request;
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    validate(schema)(req, res, next);

    expect(res.json).not.toHaveBeenCalled();
    const err = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.statusCode).toBe(400);
    expect(err.fields).toHaveProperty("name");
    expect(err.fields).toHaveProperty("age");
  });
});
