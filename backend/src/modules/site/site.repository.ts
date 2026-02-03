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
      userId: userId,
      trackingId: trackingId,
    },
  });
};

export const getSites = async (userId: string): Promise<ISite[]> => {
  return prisma.site.findMany({ where: { userId: userId } });
};

export const getSiteById = async (
  userId: string,
  siteId: string
): Promise<ISite | null> => {
  return prisma.site.findUnique({
    where: {
      id: siteId,
      userId: userId,
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
      userId: userId,
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
      userId: userId,
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
      userId: userId,
    },
    data: {
      trackingId: trackingId,
    },
  });
};
