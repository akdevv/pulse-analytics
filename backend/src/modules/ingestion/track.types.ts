import { z } from "zod";
import { EventType } from "@/types/event.ts";

// Every bound mirrors a column width in prisma/schema.prisma. An overflow is
// rejected at INSERT time, inside an already-acknowledged batch of 100, so it
// takes 99 good events with it. Derived values are clamped in track.service.ts.
const MAX_URL = 2048; // events.url, events.referrer
const MAX_TITLE = 500; // events.pageTitle
const MAX_NAME = 255; // events.eventName
const MAX_LANG = 10; // events.userLanguage

// Client-set, so bounded. A bogus value would open a hypertable chunk years
// from the rest of the data. The day of slack forward absorbs clock skew.
const TS_MIN = Date.UTC(2020, 0, 1);
const tsMax = () => Date.now() + 24 * 60 * 60 * 1000;

export const TrackQuerySchema = z.object({
  v: z.string().max(8).default("1"), // version
  tid: z.string().regex(/^pk-[a-zA-Z0-9_-]{32}$/, "Invalid tracking ID format"), // trackingId
  t: z.enum(EventType), // event type
  cid: z.uuid("Invalid client ID format").optional(), // visitorId
  sid: z.uuid("Invalid session ID format").optional(), // sessionId
  dl: z.url("Invalid URL format").max(MAX_URL), // document location (URL) - required
  dt: z.string().max(MAX_TITLE).optional(), // page title
  dr: z.url().max(MAX_URL).optional().or(z.literal("")), // referrer
  en: z.string().max(MAX_NAME).optional(), // event name
  ep: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      try {
        return JSON.parse(val);
      } catch {
        return undefined;
      }
    }), // custom props
  // 6 digits each stays inside VARCHAR(15) and still covers any real display.
  sr: z
    .string()
    .regex(/^\d{1,6}x\d{1,6}$/)
    .optional(), // screen resolution
  vp: z
    .string()
    .regex(/^\d{1,6}x\d{1,6}$/)
    .optional(), // viewport size
  ul: z.string().max(MAX_LANG).optional(), // user language
  ts: z
    .string()
    .max(20)
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const timestamp = parseInt(val, 10);
      // Dropped, not rejected. buildRawEvent falls back to server time, and a
      // bad clock should not cost a real pageview.
      if (isNaN(timestamp) || timestamp < TS_MIN || timestamp > tsMax()) {
        return undefined;
      }
      return timestamp;
    }), // timestamp (ms)
  z: z.string().max(32).optional(), // cache buster
});

export type TrackQueryParams = z.infer<typeof TrackQuerySchema>;
