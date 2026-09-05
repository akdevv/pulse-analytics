import express, { type Router } from "express";
import { authenticateToken } from "@/middleware/auth.middleware.ts";
import { aiRateLimit } from "@/middleware/rate-limiter.ts";
import {
  ask,
  deleteConversation,
  getConversation,
  listConversations,
} from "./ai.controller.ts";

const router: Router = express.Router();

// Auth first, then the limiter — it keys on req.user, and an unauthenticated
// request should never reach a counter, let alone the model.
router.post("/:siteId/ask", authenticateToken, aiRateLimit, ask);

// Reads are cheap and hit no model, so they skip the ask limiter.
router.get("/:siteId/conversations", authenticateToken, listConversations);
router.get(
  "/:siteId/conversations/:conversationId",
  authenticateToken,
  getConversation
);
router.delete(
  "/:siteId/conversations/:conversationId",
  authenticateToken,
  deleteConversation
);

export default router;
