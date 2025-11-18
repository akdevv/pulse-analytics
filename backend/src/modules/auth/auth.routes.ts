import express, { type Router } from "express";
import { register, getUser } from "./auth.controller.ts";
import { authenticateToken } from "@/middleware/auth.middleware.ts";

const router: Router = express.Router();

router.post("/register", register);
// router.post("/login", login);
// router.post("/refresh", refreshToken);
// router.post("/logout", authenticateToken, logout);

router.get("/me", authenticateToken, getUser);
// router.patch("/me", authenticateToken, updateUser);

export default router;
