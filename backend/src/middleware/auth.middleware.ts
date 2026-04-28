import jwt from "jsonwebtoken";
import env from "@/config/env.ts";
import { redis } from "@/config/redis.ts";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "@/utils/app-error.ts";

interface TokenPayload {
  userId: string;
  email: string;
  jti?: string;
}

export async function authenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) throw new AppError(401, "No token provided");

    const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as TokenPayload;

    if (payload.jti && (await redis.exists(`denylist:${payload.jti}`))) {
      throw new AppError(401, "Token revoked");
    }

    req.user = payload;
    next();
  } catch {
    throw new AppError(401, "Unauthorized");
  }
}
