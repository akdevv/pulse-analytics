import { userSchema } from "./auth.types.ts";
import type { Request, Response } from "express";

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

    return res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Registration failed",
    });
  }
};
