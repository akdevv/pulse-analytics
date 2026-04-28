import { AppError } from "@/utils/app-error.ts";
import logger from "@/utils/logger.ts";
import type { Request, Response, NextFunction } from "express";

export const errorMiddleware = (
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  // Express throws this when the request body isn't valid JSON
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({
      status: "error",
      message: "Invalid JSON in request body",
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      ...(err.code && { code: err.code }),
    });
  }

  // Anything that reaches here is unexpected — log it and return a generic 500
  logger.error("[error] unhandled error", err);

  return res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};
