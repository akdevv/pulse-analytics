import jwt from "jsonwebtoken";
import env from "@/config/env.ts";
import { config } from "@/config/index.ts";
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
    if (!token) throw AppError.tokenMissing();

    // issuer/algorithms pinned so a token minted elsewhere can't verify
    const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
      issuer: config.jwt.issuer,
      algorithms: [config.jwt.algorithm],
    }) as TokenPayload;

    if (payload.jti && (await redis.exists(`denylist:${payload.jti}`))) {
      throw AppError.tokenRevoked();
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized();
  }
}
