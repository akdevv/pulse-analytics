import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "@/utils/app-error.ts";

vi.mock("@/utils/logger.ts", () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import logger from "@/utils/logger.ts";
import { errorMiddleware } from "@/middleware/error.middleware.ts";

const req = {} as Request;
const next = vi.fn() as unknown as NextFunction;

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── error middleware ─────────────────────────────────────────────────────────

describe("errorMiddleware", () => {
  it("entity.parse.failed → 400 with Invalid JSON message", () => {
    const err = Object.assign(new Error("invalid json"), {
      type: "entity.parse.failed",
    });
    const res = makeRes();

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid JSON in request body" })
    );
  });

  it("AppError → correct statusCode and message", () => {
    const err = AppError.notFound("User");
    const res = makeRes();

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "User not found" })
    );
  });

  it("AppError with code → includes code in response", () => {
    const err = AppError.validation("email invalid");
    const res = makeRes();

    errorMiddleware(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: ErrorCode.VALIDATION_ERROR })
    );
  });

  it("unknown error → 500 with Internal server error", () => {
    const err = new Error("something exploded");
    const res = makeRes();

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Internal server error" })
    );
  });

  it("unknown error → logger.error called", () => {
    const err = new Error("something exploded");
    const res = makeRes();

    errorMiddleware(err, req, res, next);

    expect(logger.error).toHaveBeenCalled();
  });
});
