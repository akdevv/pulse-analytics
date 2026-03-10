import { asyncHandler } from "@/utils/async-handler.ts";
import type { Request, Response } from "express";
import { AnalyticsQuerySchema } from "./analytics.types.ts";
import * as AnalyticsService from "./analytics.service.ts";
import { AppError } from "@/utils/app-error.ts";

const parseQuery = (req: Request) => {
  const result = AnalyticsQuerySchema.safeParse(req.query);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors, data: null };
  }
  return { error: null, data: result.data };
};

// GET /:siteId/overview
export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const { siteId } = req.params;
  if (!siteId) {
    throw new AppError(404, "Site ID is required.");
  }

  const userId = req.user.id;

  const { error, data } = parseQuery(req);
  if (error) {
    return res.status(400).json({ error });
  }

  const result = AnalyticsService.getOverview(
    siteId,
    userId,
    data!.from,
    data!.to
  );

  return res.status(200).json({
    data: result,
  });
});

// GET /:siteId/timeseries
export const getTimeseries = asyncHandler(
  async (req: Request, res: Response) => {
    const { siteId } = req.params;
    if (!siteId) {
      throw new AppError(404, "Site ID is required.");
    }

    const userId = req.user.id;

    const { error, data } = parseQuery(req);
    if (error) {
      return res.status(400).json({ error });
    }

    const result = AnalyticsService.getTimeseries(
      siteId,
      userId,
      data!.from,
      data!.to,
      data!.interval
    );

    return res.status(200).json({
      data: result,
    });
  }
);

// GET /:siteId/pages
export const getPages = asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).json({
    message: "empty response",
  });
});

// GET /:siteId/referrers
export const getReferrers = asyncHandler(
  async (req: Request, res: Response) => {
    return res.status(200).json({
      message: "empty response",
    });
  }
);

// GET /:siteId/devices
export const getDevices = asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).json({
    message: "empty response",
  });
});

// GET /:siteId/geo
export const getGeo = asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).json({
    message: "empty response",
  });
});

// GET /:siteId/realtime
export const getRealtime = asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).json({
    message: "empty response",
  });
});
