import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("jsonwebtoken");
vi.mock("@/config/redis.ts", () => ({
  redis: { exists: vi.fn() },
}));
vi.mock("@/utils/logger.ts", () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import jwt from "jsonwebtoken";
import { redis } from "@/config/redis.ts";
import { authenticateToken } from "@/middleware/auth.middleware.ts";

const res = {} as Response;
const next = vi.fn() as unknown as NextFunction;

function makeReq(authHeader?: string): Request {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authenticateToken", () => {
  it("missing Authorization header → throws TOKEN_MISSING AppError", async () => {
    const req = makeReq();
    await expect(authenticateToken(req, res, next)).rejects.toMatchObject({
      code: "TOKEN_MISSING",
      statusCode: 401,
    });
  });

  it("valid token with no jti → sets req.user and calls next", async () => {
    const req = makeReq("Bearer valid-token");
    const payload = { userId: "123", email: "a@b.com" };
    vi.mocked(jwt.verify).mockReturnValue(payload as any);

    await authenticateToken(req, res, next);

    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledWith();
  });

  it("valid token with jti not in denylist → sets req.user and calls next", async () => {
    const req = makeReq("Bearer valid-token");
    const payload = { userId: "123", email: "a@b.com", jti: "abc" };
    vi.mocked(jwt.verify).mockReturnValue(payload as any);
    vi.mocked(redis.exists).mockResolvedValue(0);

    await authenticateToken(req, res, next);

    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledWith();
  });

  it("valid token with jti in denylist → throws TOKEN_REVOKED AppError", async () => {
    const req = makeReq("Bearer valid-token");
    const payload = { userId: "123", email: "a@b.com", jti: "abc" };
    vi.mocked(jwt.verify).mockReturnValue(payload as any);
    vi.mocked(redis.exists).mockResolvedValue(1);

    await expect(authenticateToken(req, res, next)).rejects.toMatchObject({
      code: "TOKEN_REVOKED",
      statusCode: 401,
    });
  });

  it("malformed/expired token → throws UNAUTHORIZED AppError", async () => {
    const req = makeReq("Bearer bad-token");
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error("jwt malformed");
    });

    await expect(authenticateToken(req, res, next)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  });
});
