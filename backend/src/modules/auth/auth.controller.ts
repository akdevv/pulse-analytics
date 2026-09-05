import { AppError } from "@/utils/app-error.ts";
import { userIdOf } from "@/utils/request-scope.ts";
import { redis } from "@/config/redis.ts";
import jwt from "jsonwebtoken";
import type { CookieOptions, Request, Response } from "express";
import env from "@/config/env.ts";
import {
  getUserById,
  loginUser,
  refreshTokenService,
  registerUser,
  updateUserService,
} from "./auth.service.ts";

// register, login and logout must pass identical options, or clearCookie will
// not match the cookie it removes. In production the dashboard calls the API
// cross-site, which needs sameSite "none", and browsers only accept that with
// secure. Development is same-site over plain HTTP, so "lax" applies there.
const isProduction = env.NODE_ENV === "production";

const REFRESH_COOKIE: CookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  path: "/",
};

const REFRESH_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  const result = await registerUser({ name, email, password });

  res.cookie("refresh_token", result.refreshToken, {
    ...REFRESH_COOKIE,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });

  return res.status(201).json({
    status: "success",
    message: "User registered successfully",
    data: {
      accessToken: result.accessToken,
    },
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await loginUser({ email, password });

  res.cookie("refresh_token", result.refreshToken, {
    ...REFRESH_COOKIE,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });

  return res.status(200).json({
    status: "success",
    message: "Login successful",
    data: {
      accessToken: result.accessToken,
    },
  });
};

export const refreshToken = async (req: Request, res: Response) => {
  const token = req.cookies?.refresh_token;
  if (!token) {
    throw AppError.unauthorized();
  }

  const result = await refreshTokenService(token);
  return res.status(200).json({
    status: "success",
    message: "Refresh token successful!",
    data: {
      accessToken: result.accessToken,
    },
  });
};

export const logout = async (req: Request, res: Response) => {
  const now = Math.floor(Date.now() / 1000);

  const denylistToken = async (token: string) => {
    const payload = jwt.decode(token) as { jti?: string; exp?: number } | null;
    if (payload?.jti && payload?.exp) {
      const ttl = payload.exp - now;
      if (ttl > 0) await redis.set(`denylist:${payload.jti}`, "1", "EX", ttl);
    }
  };

  const accessToken = req.headers.authorization?.split(" ")[1];
  const refreshToken = req.cookies?.refresh_token;

  await Promise.all([
    accessToken ? denylistToken(accessToken) : Promise.resolve(),
    refreshToken ? denylistToken(refreshToken) : Promise.resolve(),
  ]);

  res.clearCookie("refresh_token", REFRESH_COOKIE);

  return res.status(200).json({
    status: "success",
    message: "Logout successful",
  });
};

export const getUser = async (req: Request, res: Response) => {
  const user = await getUserById(userIdOf(req));
  if (!user) {
    throw AppError.notFound("User");
  }

  return res.status(200).json({
    status: "success",
    message: "User fetched successfully",
    data: user,
  });
};

export const updateUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  const result = await updateUserService(userIdOf(req), {
    name,
    email,
    password,
  });

  return res.status(200).json({
    status: "success",
    message: "User updated successfully",
    data: result,
  });
};
