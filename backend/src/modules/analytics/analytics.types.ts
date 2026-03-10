import { z } from "zod";

export const AnalyticsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  interval: z.enum(["hour", "day"]).default("day"),
  limit: z.coerce.number().min(1).max(100).default(10),
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
