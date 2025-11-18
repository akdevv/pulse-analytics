import jwt from "jsonwebtoken";
import env from "@/config/env.ts";
import type { IUser } from "@/modules/auth/auth.types.ts";
import type { NextFunction, Request, Response } from "express";

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get the token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "No token provided",
      });
    }

    // Verify the token
    const payload = jwt.verify(token!, env.ACCESS_TOKEN_SECRET) as IUser;
    if (!payload) {
      return res.status(401).json({
        status: "error",
        message: "Invalid token",
      });
    }

    // Add the user to the request
    req.user = payload;
    next();
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}
