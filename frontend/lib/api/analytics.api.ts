import api from "@/lib/api/client";
import type { DateRangeParams } from "@/lib/types/analytics.types";

export const getOverview = async (siteId: string, params: DateRangeParams) => {
  return api.get(`analytics/${siteId}/overview`, { params });
};

export const getTimeseries = async (
  siteId: string,
  params: DateRangeParams
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

export const getCustomEvents = async (
  siteId: string,
  params: DateRangeParams
) => {
  return api.get(`analytics/${siteId}/events`, { params });
};

export const getEventProperties = async (
  siteId: string,
  name: string,
  params: DateRangeParams
) => {
  return api.get(`analytics/${siteId}/events/properties`, {
    params: { ...params, name },
  });
};

export const getRawEvents = async (siteId: string) => {
  return api.get(`analytics/${siteId}/raw`);
};

export const runRawQuery = async (siteId: string, query: string) => {
  return api.post(`analytics/${siteId}/raw-query`, { query });
};
