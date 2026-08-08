import type { Request, Response } from "express";
// import logger from "@/utils/logger.ts";

export const health = async (_: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
};
