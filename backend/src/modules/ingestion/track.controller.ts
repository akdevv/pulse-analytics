import { enqueue } from "@/config/queue.ts";
import { asyncHandler } from "@/utils/async-handler.ts";
import logger from "@/utils/logger.ts";
import { extractClientIp } from "@/utils/ip.ts";
import type { Request, Response } from "express";
import { performance } from "perf_hooks";
import { getCachedSite } from "./track.cache.ts";
import { checkIpRateLimit, checkSiteRateLimit } from "./track.ratelimit.ts";
import { buildRawEvent } from "./track.service.ts";
import { TrackQuerySchema } from "./track.types.ts";

const SLOW_REQUEST_THRESHOLD_MS = 100;

// POST /track
export const track = asyncHandler(async (req: Request, res: Response) => {
  const totalStart = performance.now();
  const timings: Record<string, number> = {};

  // Validate
  const t1 = performance.now();
  const parsed = TrackQuerySchema.safeParse(req.query);
  timings.validation = performance.now() - t1;

  if (!parsed.success) {
    logger.warn("[track] Validation failed", {
      errors: parsed.error.flatten().fieldErrors,
      timings: formatTimings(timings),
    });
    return res.status(204).send();
  }

  const params = parsed.data;

  try {
    // Site Lookup
    const t2 = performance.now();
    const site = await getCachedSite(params.tid);
    timings.siteLookup = performance.now() - t2;

    if (!site) {
      logger.warn("[track] Unknown or inactive tracking ID", {
        tid: params.tid,
        timings: formatTimings(timings),
      });
      return res.status(204).send();
    }

    // Rate Limiting
    const t2b = performance.now();
    const ip = extractClientIp(req);
    const [siteResult, ipResult] = await Promise.all([
      checkSiteRateLimit(site.id, site.rateLimitTier),
      checkIpRateLimit(ip),
    ]);
    timings.rateLimit = performance.now() - t2b;

    if (!siteResult.allowed || !ipResult.allowed) {
      logger.warn("[track] Rate limit exceeded", {
        tid: params.tid,
        ip,
        reason: siteResult.reason ?? ipResult.reason,
        timings: formatTimings(timings),
      });
      return res.status(204).send();
    }

    // Build event
    const t3 = performance.now();
    const event = buildRawEvent(params, req, site.id);
    timings.buildEvent = performance.now() - t3;

    // DB Write
    const t4 = performance.now();

    // Enqueue the event
    enqueue(event);
    logger.info("[controller] Event queued, returning 204");

    // await insertEvent(event);
    timings.enqueue = performance.now() - t4;

    const totalTime = performance.now() - totalStart;

    // Normal log — always fires
    logger.info(`[TRACK] total: ${totalTime.toFixed(2)}ms`);

    // Slow request alert — fires only when something is unexpectedly slow
    if (totalTime > SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn(`[TRACK] Slow request detected`, {
        totalMs: totalTime.toFixed(2),
        timings: {
          validation: timings.validation,
          siteLookup: timings.siteLookup,
          rateLimit: timings.rateLimit,
          buildEvent: timings.buildEvent,
          enqueue: timings.enqueue,
        },
        request: {
          tid: params.tid,
          eventType: params.t,
          ip,
        },
      });
    }

    res.status(204).send();
  } catch (err) {
    timings.total = performance.now() - totalStart;
    logger.error(
      "[track] Failed to record event",
      err instanceof Error ? err : null,
      { tid: params.tid, timings: formatTimings(timings) }
    );

    // Always 204 — never surface internal errors to the tracked page
    res.status(204).send();
  }
});

function formatTimings(raw: Record<string, number>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, `${v.toFixed(2)}ms`])
  );
}
