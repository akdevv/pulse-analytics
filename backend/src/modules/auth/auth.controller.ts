import type { Request, Response } from "express";
import {
  registerUser,
  loginUser,
  refreshTokenService,
  getUserById,
  updateUserService,
} from "./auth.service.ts";
import { AppError } from "@/utils/app-error.ts";
import { asyncHandler } from "@/utils/async-handler.ts";

// POST /auth/register
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  const result = await registerUser({ name, email, password });

  res.cookie("refresh_token", result.refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === "production",
  });

  return res.status(200).json({
    status: "success",
    message: "User registered successfully",
    data: {
      accessToken: result.accessToken,
    },
  });
});

// POST /auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await loginUser({ email, password });

  res.cookie("refresh_token", result.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === "production",
  });

  return res.status(200).json({
    status: "success",
    message: "Login successful",
    data: {
      accessToken: result.accessToken,
    },
  });
});

// POST /auth/refresh
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const token = req.cookies?.refresh_token;
    if (!token) {
      throw new AppError(401, "Unauthorized");
    }

    const result = await refreshTokenService(token);
    return res.status(200).json({
      status: "success",
      message: "Refresh token successful!",
      data: {
        accessToken: result.accessToken,
      },
    });
  }
);

// POST /auth/logout
export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.clearCookie("refresh_token", {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  });

  return res.status(200).json({
    status: "success",
    message: "Logout successful",
  });
});

// GET /auth/me
export const getUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Unauthorized");
  }
  const user = await getUserById(req.user.id);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  return res.status(200).json({
    status: "success",
    message: "User fetched successfully",
    data: user,
  });
});

// PATCH /auth/me
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  const result = await updateUserService(req.user.id, {
    name,
    email,
    password,
  });

  return res.status(200).json({
    status: "success",
    message: "User updated successfully",
    data: result,
  });
});
