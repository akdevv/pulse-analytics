import { describe, it, expect } from "vitest";
import { AppError, ErrorCode } from "@/utils/app-error.ts";

// ─── Constructor ──────────────────────────────────────────────────────────────

describe("AppError constructor", () => {
  it("sets statusCode, message, isOperational, type", () => {
    const err = new AppError(404, "not found");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("not found");
    expect(err.isOperational).toBe(true);
    expect(err.type).toBe("app");
  });

  it("sets code when provided", () => {
    const err = new AppError(400, "bad", ErrorCode.VALIDATION_ERROR);
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it("code is undefined when omitted", () => {
    const err = new AppError(500, "oops");
    expect(err.code).toBeUndefined();
  });

  it("is instanceof Error", () => {
    const err = new AppError(500, "oops");
    expect(err).toBeInstanceOf(Error);
  });

  it("stack trace is defined", () => {
    const err = new AppError(500, "oops");
    expect(err.stack).toBeDefined();
  });
});

// ─── Static factories ─────────────────────────────────────────────────────────

describe("AppError static factories", () => {
  it("unauthorized() → 401, default message, UNAUTHORIZED code", () => {
    const err = AppError.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Unauthorized");
    expect(err.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it("forbidden() → 403, default message, FORBIDDEN code", () => {
    const err = AppError.forbidden();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("Forbidden");
    expect(err.code).toBe(ErrorCode.FORBIDDEN);
  });

  it("tokenMissing() → 401, correct message, TOKEN_MISSING code", () => {
    const err = AppError.tokenMissing();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("No token provided");
    expect(err.code).toBe(ErrorCode.TOKEN_MISSING);
  });

  it("tokenRevoked() → 401, correct message, TOKEN_REVOKED code", () => {
    const err = AppError.tokenRevoked();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Token revoked");
    expect(err.code).toBe(ErrorCode.TOKEN_REVOKED);
  });

  it("notFound() → 404, default message, NOT_FOUND code", () => {
    const err = AppError.notFound();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Resource not found");
    expect(err.code).toBe(ErrorCode.NOT_FOUND);
  });

  it("alreadyExists() → 409, default message, ALREADY_EXISTS code", () => {
    const err = AppError.alreadyExists();
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("Resource already exists");
    expect(err.code).toBe(ErrorCode.ALREADY_EXISTS);
  });

  it("validation(msg) → 400, provided message, VALIDATION_ERROR code", () => {
    const err = AppError.validation("email is invalid");
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("email is invalid");
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it("internal() → 500, default message, INTERNAL_ERROR code", () => {
    const err = AppError.internal();
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe("Internal server error");
    expect(err.code).toBe(ErrorCode.INTERNAL_ERROR);
  });
});

// ─── Custom message overrides ─────────────────────────────────────────────────

describe("AppError custom messages", () => {
  it("unauthorized(custom) uses custom message", () => {
    const err = AppError.unauthorized("you shall not pass");
    expect(err.message).toBe("you shall not pass");
  });

  it("notFound(resource) interpolates resource name", () => {
    const err = AppError.notFound("User");
    expect(err.message).toBe("User not found");
  });

  it("alreadyExists(resource) interpolates resource name", () => {
    const err = AppError.alreadyExists("Email");
    expect(err.message).toBe("Email already exists");
  });

  it("forbidden(custom) uses custom message", () => {
    const err = AppError.forbidden("no access");
    expect(err.message).toBe("no access");
  });

  it("internal(custom) uses custom message", () => {
    const err = AppError.internal("db went boom");
    expect(err.message).toBe("db went boom");
  });
});
