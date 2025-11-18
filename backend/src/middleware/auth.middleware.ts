import jwt from "jsonwebtoken";
import env from "@/config/env.ts";
import type { IUser } from "@/modules/auth/auth.types.ts";
import type { NextFunction, Request, Response } from "express";

interface AuthenticatedRequest extends Request {
  user: IUser;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Get the token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({
        status: "error",
        message: "No token provided",
      });
    }

    // Verify the token
    const payload = jwt.verify(token!, env.JWT_SECRET) as IUser;
    if (!payload) {
      res.status(401).json({
        status: "error",
        message: "Invalid token",
      });
    }

    // Add the user to the request
    req.user.id = payload.id;
    next();
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}
