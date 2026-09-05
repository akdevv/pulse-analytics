import express, { type Router } from "express";
import { health } from "./health.controller.ts";
import { healthRateLimit } from "@/middleware/rate-limiter.ts";

const router: Router = express.Router();

router.get("/", healthRateLimit, health);

export default router;
