import type { Request, Response } from "express";
import { AnalyticsQuerySchema } from "./analytics.types.ts";
import * as AnalyticsService from "./analytics.service.ts";
import { AppError } from "@/utils/app-error.ts";
import { siteScope } from "@/utils/request-scope.ts";

const parseQuery = (req: Request) => {
  const result = AnalyticsQuerySchema.safeParse(req.query);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors, data: null };
  }
  return { error: null, data: result.data };
};

export const getOverview = async (req: Request, res: Response) => {
  const { siteId, userId } = siteScope(req);

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

export const getTimeseries = async (req: Request, res: Response) => {
  const { siteId, userId } = siteScope(req);

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

export const getTopPages = async (req: Request, res: Response) => {
  const { siteId, userId } = siteScope(req);

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

export const getReferrers = async (req: Request, res: Response) => {
  const { siteId, userId } = siteScope(req);

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

export const getDevices = async (req: Request, res: Response) => {
  const { siteId, userId } = siteScope(req);

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

export const getGeo = async (req: Request, res: Response) => {
  const { siteId, userId } = siteScope(req);

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

export const getRealtime = async (req: Request, res: Response) => {
  const { siteId, userId } = siteScope(req);

  const result = await AnalyticsService.getRealtime(siteId, userId);

  return res.status(200).json({
    status: "success",
    message: "Fetched realtime",
    data: result,
  });
};

export const streamRealtime = async (req: Request, res: Response) => {
  const { siteId, userId } = siteScope(req);

  // Before headers are flushed, while a throw can still become a 4xx.
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
      // Service, not repository. The shared cache lives there.
      const result = await AnalyticsService.getCachedRealtime(siteId);
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

export const getCustomEvents = async (req: Request, res: Response) => {
  const { siteId, userId } = siteScope(req);

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

export const getEventProperties = async (req: Request, res: Response) => {
  const { siteId, userId } = siteScope(req);

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
