import express, { type Router } from "express";
import { track } from "./track.controller.ts";
import { health } from "./health.controller.ts";

const router: Router = express.Router();

// Tight size limit, reject early if limit more than 8kb
router.use(express.json({ limit: "8kb" }));

/* POST /track - Ingestion API
 *
 * Example:
 * POST /track?v=1&tid=pa-abc123&t=PAGEVIEW&dl=https://example.com&dt=Home
 * Response => 204 No Content
 */
router.post("/", track);

// Health
router.get("/health", health);

export default router;
