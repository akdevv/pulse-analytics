import { AppError } from "@/utils/app-error.ts";
import { paramOf, userIdOf } from "@/utils/request-scope.ts";
import type { Request, Response } from "express";
import {
  createSiteService,
  deleteSiteService,
  getSiteByIdService,
  getSitesService,
  regenerateTrackingIdService,
  updateSiteService,
} from "./site.service.ts";

export const createSite = async (req: Request, res: Response) => {
  const { name, domain } = req.body;
  if (!name || !domain) {
    throw AppError.validation("Name and domain are required");
  }

  const site = await createSiteService({
    userId: userIdOf(req),
    name,
    domain,
  });
  return res.status(201).json({
    status: "success",
    message: "Site created successfully!",
    data: site,
  });
};

export const getSites = async (req: Request, res: Response) => {
  const sites = await getSitesService(userIdOf(req));
  return res.status(200).json({
    status: "success",
    message: "Sites fetched successfully!",
    data: sites,
  });
};

export const getSiteById = async (req: Request, res: Response) => {
  const site = await getSiteByIdService(
    userIdOf(req),
    paramOf(req, "id", "Site ID")
  );
  return res.status(200).json({
    status: "success",
    message: "Site fetched successfully!",
    data: site,
  });
};

export const updateSite = async (req: Request, res: Response) => {
  const { name, domain } = req.body;
  const site = await updateSiteService(
    userIdOf(req),
    paramOf(req, "id", "Site ID"),
    {
      name,
      domain,
    }
  );
  return res.status(200).json({
    status: "success",
    message: "Site updated successfully!",
    data: site,
  });
};

export const deleteSite = async (req: Request, res: Response) => {
  await deleteSiteService(userIdOf(req), paramOf(req, "id", "Site ID"));
  return res.status(200).json({
    status: "success",
    message: "Site deleted successfully!",
  });
};

export const regenerateKey = async (req: Request, res: Response) => {
  const result = await regenerateTrackingIdService(
    userIdOf(req),
    paramOf(req, "id", "Site ID")
  );
  return res.status(200).json({
    status: "success",
    message: "Tracking key regenerated successfully!",
    data: result,
  });
};
