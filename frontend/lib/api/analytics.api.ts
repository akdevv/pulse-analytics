import { apiGet } from "@/lib/api/client";
import type {
  DateRangeParams,
  DeviceStats,
  EventStat,
  GeoStat,
  OverviewStats,
  PageStat,
  PropertyStat,
  RealtimeStats,
  ReferrerStat,
  TimeseriesPoint,
} from "@/lib/types/analytics.types";

export const getOverview = (siteId: string, params: DateRangeParams) =>
  apiGet<OverviewStats>(`analytics/${siteId}/overview`, { params });

export const getTimeseries = (siteId: string, params: DateRangeParams) =>
  apiGet<TimeseriesPoint[]>(`analytics/${siteId}/timeseries`, { params });

export const getTopPages = (siteId: string, params: DateRangeParams) =>
  apiGet<PageStat[]>(`analytics/${siteId}/pages`, { params });

export const getReferrers = (siteId: string, params: DateRangeParams) =>
  apiGet<ReferrerStat[]>(`analytics/${siteId}/referrers`, { params });

export const getDevices = (siteId: string, params: DateRangeParams) =>
  apiGet<DeviceStats>(`analytics/${siteId}/devices`, { params });

export const getGeo = (siteId: string, params: DateRangeParams) =>
  apiGet<GeoStat[]>(`analytics/${siteId}/geo`, { params });

export const getRealtime = (siteId: string) =>
  apiGet<RealtimeStats>(`analytics/${siteId}/realtime`);

export const getCustomEvents = (siteId: string, params: DateRangeParams) =>
  apiGet<EventStat[]>(`analytics/${siteId}/events`, { params });

export const getEventProperties = (
  siteId: string,
  name: string,
  params: DateRangeParams
) =>
  apiGet<PropertyStat[]>(`analytics/${siteId}/events/properties`, {
    params: { ...params, name },
  });
