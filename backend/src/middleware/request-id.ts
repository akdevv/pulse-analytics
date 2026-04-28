import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  req.id = (req.headers["x-request-id"] as string) ?? randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
};
