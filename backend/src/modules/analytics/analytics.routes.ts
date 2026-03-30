import express, { type Router } from "express";
import { authenticateToken } from "@/middleware/auth.middleware.ts";
import {
  getOverview,
  getTimeseries,
  getTopPages,
  getReferrers,
  getDevices,
  getGeo,
  getRealtime,
  getRawEvents,
  performRawQuery,
} from "./analytics.controller.ts";

const router: Router = express.Router();

router.get("/:siteId/overview", authenticateToken, getOverview);
router.get("/:siteId/timeseries", authenticateToken, getTimeseries);
router.get("/:siteId/pages", authenticateToken, getTopPages);
router.get("/:siteId/referrers", authenticateToken, getReferrers);
router.get("/:siteId/devices", authenticateToken, getDevices);
router.get("/:siteId/geo", authenticateToken, getGeo);
router.get("/:siteId/realtime", authenticateToken, getRealtime);
router.get("/:siteId/raw", authenticateToken, getRawEvents);

// For testing and debugging purposes - to view raw events
router.post("/:siteId/raw-query", authenticateToken, performRawQuery);

export default router;
