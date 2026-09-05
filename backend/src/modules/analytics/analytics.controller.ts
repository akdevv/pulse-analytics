import type { Request, Response } from "express";
import { AnalyticsQuerySchema } from "./analytics.types.ts";
import * as AnalyticsService from "./analytics.service.ts";
import * as AnalyticsRepository from "./analytics.repository.ts";
import { AppError } from "@/utils/app-error.ts";

const parseQuery = (req: Request) => {
  const result = AnalyticsQuerySchema.safeParse(req.query);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors, data: null };
  }
  return { error: null, data: result.data };
};

// GET /:siteId/overview
export const getOverview = async (req: Request, res: Response) => {
  const siteId = req.params.siteId as string;
  if (!siteId) throw AppError.validation("Site ID is required");

  const userId = req.user!.userId;

  const { error, data } = parseQuery(req);
  if (error) return res.status(400).json({ error });

  const result = await AnalyticsService.getOverview(
    siteId,
    userId,
    data!.from,
    data!.to
  );

  return res.status(200).json({
    status: "success",
    message: "Fetched analytics events",
    data: result,
  });
};

// GET /:siteId/timeseries
export const getTimeseries = async (req: Request, res: Response) => {
  const siteId = req.params.siteId as string;
  if (!siteId) throw AppError.validation("Site ID is required");

  const userId = req.user!.userId;

  const { error, data } = parseQuery(req);
  if (error) return res.status(400).json({ error });

  const result = await AnalyticsService.getTimeseries(
    siteId,
    userId,
    data!.from,
    data!.to,
    data!.interval
  );

  return res.status(200).json({
    status: "success",
    message: "Fetched analytics events",
    data: result,
  });
};

// GET /:siteId/pages
export const getTopPages = async (req: Request, res: Response) => {
  const siteId = req.params.siteId as string;
  if (!siteId) throw AppError.validation("Site ID is required");

  const userId = req.user!.userId;

  const { error, data } = parseQuery(req);
  if (error) return res.status(400).json({ error });

  const result = await AnalyticsService.getTopPages(
    siteId,
    userId,
    data!.from,
    data!.to,
    data!.limit
  );

  return res.status(200).json({
    status: "success",
    message: "Fetched top pages",
    data: result,
  });
};

// GET /:siteId/referrers
export const getReferrers = async (req: Request, res: Response) => {
  const siteId = req.params.siteId as string;
  if (!siteId) throw AppError.validation("Site ID is required");

  const userId = req.user!.userId;

  const { error, data } = parseQuery(req);
  if (error) return res.status(400).json({ error });

  const result = await AnalyticsService.getReferrers(
    siteId,
    userId,
    data!.from,
    data!.to,
    data!.limit
  );

  return res.status(200).json({
    status: "success",
    message: "Fetched referrers",
    data: result,
  });
};

// GET /:siteId/devices
export const getDevices = async (req: Request, res: Response) => {
  const siteId = req.params.siteId as string;
  if (!siteId) throw AppError.validation("Site ID is required");

  const userId = req.user!.userId;

  const { error, data } = parseQuery(req);
  if (error) return res.status(400).json({ error });

  const result = await AnalyticsService.getDevices(
    siteId,
    userId,
    data!.from,
    data!.to
  );

  return res.status(200).json({
    status: "success",
    message: "Fetched devices",
    data: result,
  });
};

// GET /:siteId/geo
export const getGeo = async (req: Request, res: Response) => {
  const siteId = req.params.siteId as string;
  if (!siteId) throw AppError.validation("Site ID is required");

  const userId = req.user!.userId;

  const { error, data } = parseQuery(req);
  if (error) return res.status(400).json({ error });

  const result = await AnalyticsService.getGeo(
    siteId,
    userId,
    data!.from,
    data!.to
  );

  return res.status(200).json({
    status: "success",
    message: "Fetched geo",
    data: result,
  });
};

// GET /:siteId/realtime
export const getRealtime = async (req: Request, res: Response) => {
  const siteId = req.params.siteId as string;
  if (!siteId) throw AppError.validation("Site ID is required");

  const userId = req.user!.userId;

  const result = await AnalyticsService.getRealtime(siteId, userId);

  return res.status(200).json({
    status: "success",
    message: "Fetched realtime",
    data: result,
  });
};

// GET /:siteId/realtime/stream  (SSE)
export const streamRealtime = async (req: Request, res: Response) => {
  const siteId = req.params.siteId as string;
  if (!siteId) throw AppError.validation("Site ID is required");

  const userId = req.user!.userId;

  // Verify ownership before flushing headers (can throw — Express 5 forwards it)
  await AnalyticsService.verifySiteOwnership(siteId, userId);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (payload: unknown) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const push = async () => {
    try {
      const result = await AnalyticsRepository.getRealtime(siteId);
      send({ status: "success", data: result });
    } catch {
      send({ status: "error", message: "Failed to fetch realtime data" });
    }
  };

  await push();
  const interval = setInterval(push, 5000);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
};

// GET /:siteId/raw
export const getRawEvents = async (req: Request, res: Response) => {
  const siteId = req.params.siteId as string;
  if (!siteId) throw AppError.validation("Site ID is required");

  const userId = req.user!.userId;

  const result = await AnalyticsService.getRawEvents(siteId, userId);

  return res.status(200).json({
    status: "success",
    message: "Fetched raw events",
    data: { siteId, result },
  });
};

// GET /:siteId/events
export const getCustomEvents = async (req: Request, res: Response) => {
  const siteId = req.params.siteId as string;
  if (!siteId) throw AppError.validation("Site ID is required");

  const userId = req.user!.userId;

  const { error, data } = parseQuery(req);
  if (error) return res.status(400).json({ error });

  const result = await AnalyticsService.getCustomEvents(
    siteId,
    userId,
    data!.from,
    data!.to,
    data!.limit
  );

  return res.status(200).json({
    status: "success",
    message: "Fetched custom events",
    data: result,
  });
};

// GET /:siteId/events/properties?name=signup_completed
export const getEventProperties = async (req: Request, res: Response) => {
  const siteId = req.params.siteId as string;
  if (!siteId) throw AppError.validation("Site ID is required");

  const userId = req.user!.userId;

  const { error, data } = parseQuery(req);
  if (error) return res.status(400).json({ error });
  if (!data!.name) throw AppError.validation("Event name is required");

  const result = await AnalyticsService.getEventProperties(
    siteId,
    userId,
    data!.name,
    data!.from,
    data!.to
  );

  return res.status(200).json({
    status: "success",
    message: "Fetched event properties",
    data: result,
  });
};
