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
  streamRealtime,
  getCustomEvents,
  getEventProperties,
} from "./analytics.controller.ts";

const router: Router = express.Router();

router.get("/:siteId/overview", authenticateToken, getOverview);
router.get("/:siteId/timeseries", authenticateToken, getTimeseries);
router.get("/:siteId/pages", authenticateToken, getTopPages);
router.get("/:siteId/referrers", authenticateToken, getReferrers);
router.get("/:siteId/devices", authenticateToken, getDevices);
router.get("/:siteId/geo", authenticateToken, getGeo);
router.get("/:siteId/realtime", authenticateToken, getRealtime);
router.get("/:siteId/realtime/stream", authenticateToken, streamRealtime);
router.get("/:siteId/events", authenticateToken, getCustomEvents);
router.get(
  "/:siteId/events/properties",
  authenticateToken,
  getEventProperties
);

export default router;
