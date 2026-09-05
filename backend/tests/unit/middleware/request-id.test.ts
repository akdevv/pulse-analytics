import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requestId } from "@/middleware/request-id.ts";

function makeReq(xRequestId?: string): Request {
  return {
    headers: xRequestId ? { "x-request-id": xRequestId } : {},
  } as unknown as Request;
}

function makeRes() {
  return { setHeader: vi.fn() } as unknown as Response;
}

describe("requestId middleware", () => {
  it("uses x-request-id header when present", () => {
    const req = makeReq("my-custom-id");
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requestId(req, res, next);

    expect(req.id).toBe("my-custom-id");
  });

  it("generates a UUID when header is absent", () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requestId(req, res, next);

    expect(req.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("sets x-request-id response header", () => {
    const req = makeReq("abc-123");
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requestId(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("x-request-id", "abc-123");
  });

  it("sets req.id", () => {
    const req = makeReq("xyz-999");
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requestId(req, res, next);

    expect(req.id).toBe("xyz-999");
  });

  it("calls next()", () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    requestId(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
