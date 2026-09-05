export const ErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  TOKEN_MISSING: "TOKEN_MISSING",
  TOKEN_REVOKED: "TOKEN_REVOKED",
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_JSON: "INVALID_JSON",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// A known, user-facing error. The error middleware treats anything else
// as an unexpected failure.
export class AppError extends Error {
  public readonly type = "app";
  public readonly statusCode: number;
  public readonly isOperational = true;
  public readonly code?: ErrorCode | undefined;

  constructor(statusCode: number, message: string, code?: ErrorCode) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }

  static unauthorized(message = "Unauthorized") {
    return new AppError(401, message, ErrorCode.UNAUTHORIZED);
  }

  static forbidden(message = "Forbidden") {
    return new AppError(403, message, ErrorCode.FORBIDDEN);
  }

  static tokenMissing() {
    return new AppError(401, "No token provided", ErrorCode.TOKEN_MISSING);
  }

  static tokenRevoked() {
    return new AppError(401, "Token revoked", ErrorCode.TOKEN_REVOKED);
  }

  static notFound(resource = "Resource") {
    return new AppError(404, `${resource} not found`, ErrorCode.NOT_FOUND);
  }

  static alreadyExists(resource = "Resource") {
    return new AppError(
      409,
      `${resource} already exists`,
      ErrorCode.ALREADY_EXISTS
    );
  }

  static validation(message: string) {
    return new AppError(400, message, ErrorCode.VALIDATION_ERROR);
  }

  static internal(message = "Internal server error") {
    return new AppError(500, message, ErrorCode.INTERNAL_ERROR);
  }
}
