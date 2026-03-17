import { asyncHandler } from "@/utils/async-handler.ts";
import type { NextFunction, Request, Response } from "express";
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
  }
);

// GET /:siteId/pages
export const getTopPages = asyncHandler(async (req: Request, res: Response) => {
  const { siteId } = req.params;
  if (!siteId) {
    throw new AppError(404, "Site ID is required.");
  }

  const userId = (req as any).user.id;

  const { error, data } = parseQuery(req);
  if (error) return res.status(400).json({ error });

  const result = await AnalyticsService.getTopPages(
    siteId,
    userId,
    data!.from,
    data!.to,
    data!.limit
  );
  res.status(200).json({
    status: "success",
    message: "Fetched top pages",
    data: result,
  });
});

export const getReferrers = asyncHandler(
  async (req: Request, res: Response) => {
    const { siteId } = req.params;
    if (!siteId) {
      throw new AppError(404, "Site ID is required.");
    }

    const userId = (req as any).user.id;

    const { error, data } = parseQuery(req);
    if (error) return res.status(400).json({ error });

    const result = await AnalyticsService.getReferrers(
      siteId,
      userId,
      data!.from,
      data!.to,
      data!.limit
    );
    res.status(200).json({
      status: "success",
      message: "Fetched referrers",
      data: result,
    });
  }
);

export const getDevices = asyncHandler(async (req: Request, res: Response) => {
  const { siteId } = req.params;
  if (!siteId) {
    throw new AppError(404, "Site ID is required.");
  }

  const userId = (req as any).user.id;

  const { error, data } = parseQuery(req);
  if (error) return res.status(400).json({ error });

  const result = await AnalyticsService.getDevices(
    siteId,
    userId,
    data!.from,
    data!.to
  );
  res.status(200).json({
    status: "success",
    message: "Fetched devices",
    data: result,
  });
});

export const getGeo = asyncHandler(async (req: Request, res: Response) => {
  const { siteId } = req.params;
  if (!siteId) {
    throw new AppError(404, "Site ID is required.");
  }

  const userId = (req as any).user.id;

  const { error, data } = parseQuery(req);
  if (error) return res.status(400).json({ error });

  const result = await AnalyticsService.getGeo(
    siteId,
    userId,
    data!.from,
    data!.to
  );
  res.status(200).json({
    status: "success",
    message: "Fetched geo",
    data: result,
  });
});

export const getRealtime = asyncHandler(async (req: Request, res: Response) => {
  const { siteId } = req.params;
  if (!siteId) {
    throw new AppError(404, "Site ID is required.");
  }
  const userId = (req as any).user.id;

  const result = await AnalyticsService.getRealtime(siteId, userId);
  res.status(200).json({
    status: "success",
    message: "Fetched realtime",
    data: result,
  });
});
