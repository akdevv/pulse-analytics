import { authenticateToken } from "@/middleware/auth.middleware.ts";
import { validate } from "@/middleware/validate.ts";
import express, { type Router } from "express";
import {
  getUser,
  login,
  logout,
  refreshToken,
  register,
  updateUser,
} from "./auth.controller.ts";
import {
  loginUserSchema,
  registerUserSchema,
  updateUserSchema,
} from "./auth.types.ts";

const router: Router = express.Router();

router.post("/register", validate(registerUserSchema), register);
router.post("/login", validate(loginUserSchema), login);
router.post("/refresh", authenticateToken, refreshToken);
router.post("/logout", authenticateToken, logout);

router.get("/me", authenticateToken, getUser);
router.patch("/me", authenticateToken, validate(updateUserSchema), updateUser);

export default router;
