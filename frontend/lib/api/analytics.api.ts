import api from "@/lib/api/client";
import type { DateRangeParams } from "@/lib/types/analytics.types";

export const getOverview = async (siteId: string, params: DateRangeParams) => {
  return api.get(`analytics/${siteId}/overview`, { params });
};

export const getTimeseries = async (
  siteId: string,
  params: DateRangeParams,
) => {
  return api.get(`analytics/${siteId}/timeseries`, { params });
};

export const getTopPages = async (siteId: string, params: DateRangeParams) => {
  return api.get(`analytics/${siteId}/pages`, { params });
};

export const getReferrers = async (siteId: string, params: DateRangeParams) => {
  return api.get(`analytics/${siteId}/referrers`, { params });
};

export const getDevices = async (siteId: string, params: DateRangeParams) => {
  return api.get(`analytics/${siteId}/devices`, { params });
};

export const getGeo = async (siteId: string, params: DateRangeParams) => {
  return api.get(`analytics/${siteId}/geo`, { params });
};

export const getRealtime = async (siteId: string) => {
  return api.get(`analytics/${siteId}/realtime`);
};
