import { z } from "zod";

const dateString = z
  .string()
  .refine((s) => !isNaN(Date.parse(s)), { message: "Invalid date" })
  .optional();

export const AnalyticsQuerySchema = z.object({
  from: dateString,
  to: dateString,
  interval: z.enum(["hour", "day"]).default("day"),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  // Only /events/properties reads this. Event names are free text up to 255
  // chars, so they travel as a query param rather than a path segment.
  name: z.string().max(255).optional(),
});

export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;

export interface DateRange {
  fromDate: Date;
  toDate: Date;
}

// ─── Response shapes ───────────

export interface OverviewStats {
  totalPageviews: number;
  totalSessions: number;
  totalVisitors: number;
}

export interface TimeseriesPoint {
  time: string; // ISO string
  pageviews: number;
  sessions: number;
}

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

/** One (key, value) pair seen in an event's properties, with how often. */
export interface PropertyStat {
  key: string;
  value: string;
  count: number;
}
