import jwt from "jsonwebtoken";
import env from "@/config/env.ts";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "@/utils/app-error.ts";

interface TokenPayload {
  userId: string;
  email: string;
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get the token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new AppError(401, "No token provided");
    }

    // Verify the token
    const payload = jwt.verify(token!, env.ACCESS_TOKEN_SECRET) as TokenPayload;
    if (!payload) {
      throw new AppError(401, "Invalid token");
    }

    // Add the user to the request
    req.user = payload;
    next();
  } catch (error) {
    throw new AppError(401, "Unauthorized");
  }
}
