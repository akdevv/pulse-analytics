import { AppError } from "@/utils/app-error.ts";
import { getSiteForUser } from "./analytics.repository.ts";
import { type DateRange } from "./analytics.types.ts";
import * as analyticsRepository from "./analytics.repository.ts";

// ---------- Helpers -------------------

/**
 * Resolve `from` / `to` query strings into Date objects.
 * Defaults: from = 7 days ago, to = now.
 */
export function resolveDateRange(from?: string, to?: string): DateRange {
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from
    ? new Date(from)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return { fromDate, toDate };
}

/**
 * Verify the requesting user owns the site.
 * Throws 403 if not.
 */
export const verifySiteOwnership = async (siteId: string, userId: string) => {
  const site = await getSiteForUser(siteId, userId);
  if (!site) {
    throw AppError.forbidden("Site not found or access denied");
  }

  return site;
};

// ---------- Service Functions ---------

export const getOverview = async (
  siteId: string,
  userId: string,
  from?: string,
  to?: string
) => {
  await verifySiteOwnership(siteId, userId);
  const { fromDate, toDate } = resolveDateRange(from, to);
  return analyticsRepository.getOverview(siteId, fromDate, toDate);
};

export const getTimeseries = async (
  siteId: string,
  userId: string,
  from?: string,
  to?: string,
  interval: "hour" | "day" = "day"
) => {
  await verifySiteOwnership(siteId, userId);
  const { fromDate, toDate } = resolveDateRange(from, to);
  return analyticsRepository.getTimeseries(siteId, fromDate, toDate, interval);
};

export async function getTopPages(
  siteId: string,
  userId: string,
  from?: string,
  to?: string,
  limit: number = 10
) {
  await verifySiteOwnership(siteId, userId);
  const { fromDate, toDate } = resolveDateRange(from, to);
  return analyticsRepository.getTopPages(siteId, fromDate, toDate, limit);
}

export async function getReferrers(
  siteId: string,
  userId: string,
  from?: string,
  to?: string,
  limit: number = 10
) {
  await verifySiteOwnership(siteId, userId);
  const { fromDate, toDate } = resolveDateRange(from, to);
  return analyticsRepository.getReferrers(siteId, fromDate, toDate, limit);
}

export async function getDevices(
  siteId: string,
  userId: string,
  from?: string,
  to?: string
) {
  await verifySiteOwnership(siteId, userId);
  const { fromDate, toDate } = resolveDateRange(from, to);
  return analyticsRepository.getDevices(siteId, fromDate, toDate);
}

export async function getGeo(
  siteId: string,
  userId: string,
  from?: string,
  to?: string
) {
  await verifySiteOwnership(siteId, userId);
  const { fromDate, toDate } = resolveDateRange(from, to);
  return analyticsRepository.getGeo(siteId, fromDate, toDate);
}

export async function getRealtime(siteId: string, userId: string) {
  await verifySiteOwnership(siteId, userId);
  return analyticsRepository.getRealtime(siteId);
}

export async function getRawEvents(siteId: string, userId: string) {
  await verifySiteOwnership(siteId, userId);
  return analyticsRepository.getRawEvents(siteId);
}
