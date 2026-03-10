import express, { type Router } from "express";
import { authenticateToken } from "@/middleware/auth.middleware.ts";
import {
  getOverview,
  getTimeseries,
  getPages,
  getReferrers,
  getDevices,
  getGeo,
  getRealtime,
} from "./analytics.controller.ts";

const router: Router = express.Router();

router.get("/:siteId/overview", authenticateToken, getOverview);
router.get("/:siteId/timeseries", authenticateToken, getTimeseries);
router.get("/:siteId/pages", authenticateToken, getPages);
router.get("/:siteId/referrers", authenticateToken, getReferrers);
router.get("/:siteId/devices", authenticateToken, getDevices);
router.get("/:siteId/geo", authenticateToken, getGeo);
router.get("/:siteId/realtime", authenticateToken, getRealtime);

export default router;
