import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "@/utils/async-handler.ts";

const req = {} as Request;
const res = {} as Response;

describe("asyncHandler", () => {
  it("calls wrapped fn with (req, res, next)", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const next = vi.fn() as unknown as NextFunction;

    asyncHandler(fn)(req, res, next);
    await Promise.resolve();

    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it("does not call next when fn resolves", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const next = vi.fn() as unknown as NextFunction;

    asyncHandler(fn)(req, res, next);
    await Promise.resolve();

    expect(next).not.toHaveBeenCalled();
  });

  it("calls next(err) when fn rejects", async () => {
    const err = new Error("boom");
    const fn = vi.fn().mockRejectedValue(err);
    const next = vi.fn() as unknown as NextFunction;

    asyncHandler(fn)(req, res, next);
    await Promise.resolve();

    expect(next).toHaveBeenCalledWith(err);
  });
});
