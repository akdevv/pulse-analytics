import {
  generateEmbedCode,
  generateTrackingId,
} from "@/helpers/gen-tracking.ts";
import { AppError } from "@/utils/app-error.ts";
import {
  createSite,
  deleteSite,
  findSiteByDomain,
  getSiteById,
  getSites,
  updateSite,
  updateTrackingId,
} from "./site.repository.ts";
import type { ISite } from "./site.types.ts";

export const createSiteService = async ({
  userId,
  name,
  domain,
}: {
  userId: string;
  name: string;
  domain: string;
}): Promise<{ site: ISite; embedCode: string }> => {
  const existingSite = await findSiteByDomain(domain);
  if (existingSite) {
    throw new AppError(409, "Site already exists");
  }

  // generate tracking id & embed code
  const trackingId = generateTrackingId();
  const embedCode = generateEmbedCode(trackingId);

  const site = await createSite(userId, name, domain, trackingId);

  return {
    site,
    embedCode,
  };
};

export const getSitesService = async (userId: string): Promise<ISite[]> => {
  const sites = await getSites(userId);
  return sites;
};

export const getSiteByIdService = async (
  userId: string,
  siteId: string
): Promise<ISite> => {
  const site = await getSiteById(userId, siteId);
  if (!site) {
    throw new AppError(404, "Site not found");
  }
  return site;
};

export const updateSiteService = async (
  userId: string,
  siteId: string,
  data: { name?: string; domain?: string }
): Promise<ISite> => {
  // Check if site exists and belongs to user
  const existingSite = await getSiteById(userId, siteId);
  if (!existingSite) {
    throw new AppError(404, "Site not found");
  }

  // If domain is being updated, check if new domain is already taken
  if (data.domain && data.domain !== existingSite.domain) {
    const siteWithDomain = await findSiteByDomain(data.domain);
    if (siteWithDomain) {
      throw new AppError(409, "Domain already exists");
    }
  }

  const updatedSite = await updateSite(userId, siteId, data);
  return updatedSite;
};

export const deleteSiteService = async (
  userId: string,
  siteId: string
): Promise<void> => {
  // Check if site exists and belongs to user
  const existingSite = await getSiteById(userId, siteId);
  if (!existingSite) {
    throw new AppError(404, "Site not found");
  }

  await deleteSite(userId, siteId);
};

export const regenerateTrackingIdService = async (
  userId: string,
  siteId: string
): Promise<{ site: ISite; embedCode: string }> => {
  // Check if site exists and belongs to user
  const existingSite = await getSiteById(userId, siteId);
  if (!existingSite) {
    throw new AppError(404, "Site not found");
  }

  // Generate new tracking ID and embed code
  const newTrackingId = generateTrackingId();
  const embedCode = generateEmbedCode(newTrackingId);

  const updatedSite = await updateTrackingId(userId, siteId, newTrackingId);

  return {
    site: updatedSite,
    embedCode,
  };
};
