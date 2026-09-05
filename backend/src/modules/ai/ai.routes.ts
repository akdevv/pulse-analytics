import express, { type Router } from "express";
import { authenticateToken } from "@/middleware/auth.middleware.ts";
import {
  aiGlobalRateLimit,
  aiRateLimit,
  aiReadRateLimit,
} from "@/middleware/rate-limiter.ts";
import {
  ask,
  deleteConversation,
  getConversation,
  listConversations,
} from "./ai.controller.ts";

const router: Router = express.Router();

// Auth first: the per-user limiter keys on req.user. Global before per-user,
// so a spent budget does not burn one user's counter on its way to a refusal.
router.post(
  "/:siteId/ask",
  authenticateToken,
  aiGlobalRateLimit,
  aiRateLimit,
  ask
);

// No model call, so these skip the ask limiter. getConversation still replays
// stored SQL on the two-connection AI pool, hence a looser limit, not none.
router.get(
  "/:siteId/conversations",
  authenticateToken,
  aiReadRateLimit,
  listConversations
);
router.get(
  "/:siteId/conversations/:conversationId",
  authenticateToken,
  aiReadRateLimit,
  getConversation
);
router.delete(
  "/:siteId/conversations/:conversationId",
  authenticateToken,
  aiReadRateLimit,
  deleteConversation
);

export default router;
