import { userSchema } from "./auth.types.ts";
import type { Request, Response } from "express";
import { registerUser, getUserById } from "./auth.service.ts";

// POST /auth/register
export const register = async (req: Request, res: Response) => {
  try {
    // Validate the request body
    const { email, password, firstName, lastName } = req.body;
    const { error } = userSchema.safeParse(req.body);
    if (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }

    // Register user
    const result = await registerUser({ email, password, firstName, lastName });

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Registration failed",
    });
  }
};

// GET /auth/me
export const getUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch user",
    });
  }
};
