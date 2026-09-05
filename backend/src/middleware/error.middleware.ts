import { AppError } from "@/utils/app-error.ts";
import { ValidationError } from "@/middleware/validate.ts";
import logger from "@/utils/logger.ts";
import type { Request, Response, NextFunction } from "express";

// Prisma errors that are the caller's fault. Everything else is a 500.
const PRISMA_STATUS: Record<string, { status: number; message: string }> = {
  P2000: { status: 400, message: "A value is too long for its field" },
  P2002: { status: 409, message: "That already exists" },
  P2003: {
    status: 409,
    message: "That record is still referenced by other data",
  },
  P2025: { status: 404, message: "Record not found" },
};

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  // body-parser's code for malformed JSON
  if ((err as any)?.type === "entity.parse.failed") {
    return res.status(400).json({
      status: "error",
      message: "Invalid JSON in request body",
    });
  }

  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      code: err.code,
      errors: err.fields,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      ...(err.code && { code: err.code }),
    });
  }

  const prismaCode = (err as { code?: unknown }).code;
  if (typeof prismaCode === "string" && prismaCode in PRISMA_STATUS) {
    const mapped = PRISMA_STATUS[prismaCode]!;
    logger.warn("[error] prisma constraint error", {
      code: prismaCode,
      message: err.message,
    });
    return res.status(mapped.status).json({
      status: "error",
      message: mapped.message,
      code: prismaCode,
    });
  }

  logger.error("[error] unhandled error", err);

  return res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};
