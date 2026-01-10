import { prisma } from "@/config/prisma.ts";
import type { ISite } from "./site.types.ts";

export const findSiteByDomain = async (
  domain: string
): Promise<ISite | null> => {
  return prisma.site.findUnique({ where: { domain } });
};

export const createSite = async (
  userId: string,
  name: string,
  domain: string,
  trackingId: string
): Promise<ISite> => {
  return prisma.site.create({
    data: {
      name,
      domain,
      user_id: userId,
      tracking_id: trackingId,
    },
  });
};

export const getSites = async (userId: string): Promise<ISite[]> => {
  return prisma.site.findMany({ where: { user_id: userId } });
};

export const getSiteById = async (
  userId: string,
  siteId: string
): Promise<ISite | null> => {
  return prisma.site.findUnique({
    where: {
      id: siteId,
      user_id: userId,
    },
  });
};

export const updateSite = async (
  userId: string,
  siteId: string,
  data: { name?: string; domain?: string }
): Promise<ISite> => {
  return prisma.site.update({
    where: {
      id: siteId,
      user_id: userId,
    },
    data,
  });
};

export const deleteSite = async (
  userId: string,
  siteId: string
): Promise<void> => {
  await prisma.site.delete({
    where: {
      id: siteId,
      user_id: userId,
    },
  });
};

export const updateTrackingId = async (
  userId: string,
  siteId: string,
  trackingId: string
): Promise<ISite> => {
  return prisma.site.update({
    where: {
      id: siteId,
      user_id: userId,
    },
    data: {
      tracking_id: trackingId,
    },
  });
};
