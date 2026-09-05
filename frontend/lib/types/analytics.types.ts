export type DateRangeParams = {
  from: string;
  to: string;
  interval?: "hour" | "day";
  limit?: number;
};

export type OverviewStats = {
  totalPageviews: number;
  totalSessions: number;
  totalVisitors: number;
};

export type TimeseriesPoint = {
  time: string;
  pageviews: number;
  sessions: number;
};

export interface PageStat {
  page: string;
  pageviews: number;
}

export interface ReferrerStat {
  source: string;
  pageviews: number;
}

export interface DeviceStats {
  browsers: { browser: string; pageviews: number }[];
  os: { os: string; pageviews: number }[];
  devices: { device: string; pageviews: number }[];
}

export interface GeoStat {
  country: string;
  pageviews: number;
}

export interface RealtimeStats {
  activeSessions: number;
  pageviews: number;
  visitors: number;
  activePages: { path: string; activeSessions: number; pageviews: number }[];
  topReferrers: { referrer: string | null; activeSessions: number }[];
  events: { name: string; count: number }[];
}

export interface EventStat {
  eventName: string;
  count: number;
  visitors: number;
}

export interface PropertyStat {
  key: string;
  value: string;
  count: number;
  distinctValues: number;
}
