import express, { type Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  getUser,
  updateUser,
} from "./auth.controller.ts";
import {
  registerUserSchema,
  loginUserSchema,
  updateUserSchema,
} from "./auth.types.ts";
import { validate } from "@/middleware/validate.ts";
import { authenticateToken } from "@/middleware/auth.middleware.ts";

const router: Router = express.Router();

router.post("/register", validate(registerUserSchema), register);
router.post("/login", validate(loginUserSchema), login);
router.post("/refresh", refreshToken);
router.post("/logout", authenticateToken, logout);

router.get("/me", authenticateToken, getUser);
router.patch("/me", authenticateToken, validate(updateUserSchema), updateUser);

export default router;
