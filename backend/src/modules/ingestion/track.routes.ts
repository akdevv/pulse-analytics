import express, { type Router } from "express";
import { track } from "./track.controller.ts";

const router: Router = express.Router();

router.use(express.json({ limit: "8kb" }));

// POST /track?v=1&tid=pk-abc123&t=PAGEVIEW&dl=https://example.com&dt=Home => 204
router.post("/", track);

export default router;
