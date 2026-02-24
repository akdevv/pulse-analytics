import { z } from "zod";
import { EventType } from "@/types/event.ts";

export const TrackQuerySchema = z.object({
  v: z.string().default("1"), // version
  tid: z.string().regex(/^pk-[a-zA-Z0-9]{29}$/, "Invalid tracking ID format"), // trackingId
  t: z.enum(EventType), // event type
  cid: z.uuid("Invalid client ID format").optional(), // visitorId
  sid: z.uuid("Invalid session ID format").optional(), // sessionId
  dl: z.url("Invalid URL format"), // document location (URL) - required
  dt: z.string().max(500).optional(), // page title
  dr: z.url().optional().or(z.literal("")), // referrer
  en: z.string().max(255).optional(), // event name
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
  sr: z
    .string()
    .regex(/^\d+x\d+$/)
    .optional(), // screen resoultion
  vp: z
    .string()
    .regex(/^\d+x\d+$/)
    .optional(), // viewport size
  ul: z.string().max(10).optional(), // user language
  ts: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const timestamp = parseInt(val, 10);
      return isNaN(timestamp) ? undefined : timestamp;
    }), // timestamp (ms)
  z: z.string().optional(), // cache buster
  debug: z.coerce.boolean().optional().default(false), // debug_mode
});

export type TrackQueryParams = z.infer<typeof TrackQuerySchema>;
