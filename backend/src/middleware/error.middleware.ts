import { AppError } from "@/utils/app-error.ts";
import type { Request, Response, NextFunction } from "express";

export const errorMiddleware = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({
      status: "error",
      message: "Invalid JSON in request body",
    });
  }

  // known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  // unhandled errors
  console.error("[UNHANDLED ERROR]:", err);

  return res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};
