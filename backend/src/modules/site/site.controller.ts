import { AppError } from "@/utils/app-error.ts";
import { asyncHandler } from "@/utils/async-handler.ts";
import type { Request, Response } from "express";
import {
  createSiteService,
  deleteSiteService,
  getSiteByIdService,
  getSitesService,
  regenerateTrackingIdService,
  updateSiteService,
} from "./site.service.ts";

// POST /sites
export const createSite = asyncHandler(async (req: Request, res: Response) => {
  if (!req?.user?.userId) {
    throw AppError.unauthorized();
  }

  const { name, domain } = req.body;
  if (!name || !domain) {
    throw AppError.validation("Name and domain are required");
  }

  const site = await createSiteService({
    userId: req.user.userId,
    name,
    domain,
  });
  return res.status(201).json({
    status: "success",
    message: "Site created successfully!",
    data: site,
  });
});

// GET /sites
export const getSites = asyncHandler(async (req: Request, res: Response) => {
  if (!req?.user?.userId) {
    throw AppError.unauthorized();
  }

  const sites = await getSitesService(req.user.userId);
  return res.status(200).json({
    status: "success",
    message: "Sites fetched successfully!",
    data: sites,
  });
});

// GET /sites/:id
export const getSiteById = asyncHandler(async (req: Request, res: Response) => {
  if (!req?.user?.userId) {
    throw AppError.unauthorized();
  }

  const site = await getSiteByIdService(req.user.userId, req.params.id!);
  return res.status(200).json({
    status: "success",
    message: "Site fetched successfully!",
    data: site,
  });
});

// PUT /sites/:id
export const updateSite = asyncHandler(async (req: Request, res: Response) => {
  if (!req?.user?.userId) {
    throw AppError.unauthorized();
  }

  const { name, domain } = req.body;
  const site = await updateSiteService(req.user.userId, req.params.id!, {
    name,
    domain,
  });
  return res.status(200).json({
    status: "success",
    message: "Site updated successfully!",
    data: site,
  });
});

// DELETE /sites/:id
export const deleteSite = asyncHandler(async (req: Request, res: Response) => {
  if (!req?.user?.userId) {
    throw AppError.unauthorized();
  }

  await deleteSiteService(req.user.userId, req.params.id!);
  return res.status(200).json({
    status: "success",
    message: "Site deleted successfully!",
  });
});

// POST /sites/:id/regen-key
export const regenerateKey = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req?.user?.userId) {
      throw AppError.unauthorized();
    }

    const result = await regenerateTrackingIdService(
      req.user.userId,
      req.params.id!
    );
    return res.status(200).json({
      status: "success",
      message: "Tracking key regenerated successfully!",
      data: result,
    });
  }
);
