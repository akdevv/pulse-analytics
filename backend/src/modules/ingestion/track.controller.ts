import type { Request, Response } from "express";
import { TrackQuerySchema } from "./track.types.ts";
import logger from "@/utils/logger.ts";
import { asyncHandler } from "@/utils/async-handler.ts";
import { performance } from "perf_hooks";
import { prisma } from "@/config/prisma.ts";
import { buildParsedEvent } from "./track.service.ts";
import { insertEvent } from "./track.repository.ts";

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
    const site = await prisma.site.findFirst({
      where: { trackingId: params.tid, isActive: true },
      select: { id: true }, // Only fetch the id
    });
    timings.siteLookup = performance.now() - t2;

    if (!site) {
      logger.warn("[track] Unknown or inactive tracking ID", {
        tid: params.tid,
        timings: formatTimings(timings),
      });
      return res.status(204).send();
    }

    // Build event
    const t3 = performance.now();
    const event = buildParsedEvent(params, req, site.id);
    timings.buildEvent = performance.now() - t3;

    // DB Write
    const t4 = performance.now();
    await insertEvent(event);
    timings.eventWrite = performance.now() - t4;

    timings.total = performance.now() - totalStart;

    // Always log if debug=true or if the request was unexpectedly slow
    if (params.debug || timings.total > 100) {
      logger.info("[track] Event recorded", {
        tid: params.tid,
        eventType: params.t,
        timings: formatTimings(timings),
      });
    } else {
      logger.debug("[track] Event recorded", {
        tid: params.tid,
        timings: formatTimings(timings),
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
