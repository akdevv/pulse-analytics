import { authenticateToken } from "@/middleware/auth.middleware.ts";
import { validate } from "@/middleware/validate.ts";
import express, { type Router } from "express";
import {
  createSite,
  deleteSite,
  getSiteById,
  getSites,
  regenerateKey,
  updateSite,
} from "./site.controller.ts";
import { createSiteSchema, updateSiteSchema } from "./site.types.ts";

const router: Router = express.Router();

router.post("/", authenticateToken, validate(createSiteSchema), createSite);
router.get("/", authenticateToken, getSites);
router.get("/:id", authenticateToken, getSiteById);
router.put("/:id", authenticateToken, validate(updateSiteSchema), updateSite);
router.delete("/:id", authenticateToken, deleteSite);
router.post("/:id/regen-key", authenticateToken, regenerateKey);

export default router;
