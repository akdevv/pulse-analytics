import type { Request } from "express";
import { AppError } from "@/utils/app-error.ts";

// Safe because every caller sits behind authenticateToken.
export const userIdOf = (req: Request): string => req.user!.userId;

// Express will not match the route without the param, so the throw is a
// backstop. Express 5 types params as string | string[], hence the narrowing.
export const paramOf = (req: Request, name: string, label: string): string => {
  const value = req.params[name];
  if (typeof value !== "string" || !value) {
    throw AppError.validation(`${label} is required`);
  }
  return value;
};

export const siteScope = (req: Request): { siteId: string; userId: string } => ({
  siteId: paramOf(req, "siteId", "Site ID"),
  userId: userIdOf(req),
});
