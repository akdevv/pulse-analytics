import type { DeviceInfo, ParsedEvent } from "@/types/event.ts";
import type { Request } from "express";
import { UAParser } from "ua-parser-js";
import type { TrackQueryParams } from "./track.types.ts";
import { v4 as uuidv4 } from "uuid";

// Extract IP from request.
export function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
      ?.split(", ")[0]
      ?.trim();
    if (first) return first;
  }

  return req.socket.remoteAddress;
}

// Parses a full URL into its components
function parseUrl(rawUrl: string): {
  urlHostname: string;
  urlPathname: string;
  urlSearch?: string | undefined;
} {
  try {
    const parsed = new URL(rawUrl);
    return {
      urlHostname: parsed.hostname,
      urlPathname: parsed.pathname,
      // Only store search if it has actual params — avoid storing bare "?"
      urlSearch: parsed.search !== "" ? parsed.search : undefined,
    };
  } catch {
    // Malformed URL — store what we can, don't crash the ingestion
    return {
      urlHostname: "",
      urlPathname: rawUrl,
    };
  }
}

export function parseUserAgent(uaString: string | undefined): DeviceInfo {
  if (!uaString) {
    return {
      deviceType: "unknown",
      browser: "Unknown",
      browserVersion: "Unknown",
      os: "Unknown",
      osVersion: "Unknown",
    };
  }

  const parser = new UAParser(uaString);
  const result = parser.getResult();

  return {
    deviceType: result.device.type ?? "desktop",
    browser: result.browser.name ?? "Unknown",
    browserVersion: result.browser.version ?? "Unknown",
    os: result.os.name ?? "Unknown",
    osVersion: result.os.version ?? "Unknown",
  };
}

export function buildParsedEvent(
  params: TrackQueryParams,
  req: Request,
  siteId: string
): ParsedEvent {
  const now = new Date();

  // Parse URL components
  const { urlHostname, urlPathname, urlSearch } = parseUrl(params.dl);

  // Parse User-Agent
  const deviceInfo = parseUserAgent(req.headers["user-agent"]);

  // Resolve timestamp
  const timestamp = params.ts ? new Date(params.ts) : now;

  return {
    siteId,
    eventId: uuidv4(), // unique ID for this event, separate from DB row id
    eventType: params.t as ParsedEvent["eventType"],
    eventName: params.en,

    // URL
    url: params.dl,
    urlHostname,
    urlPathname,
    urlSearch,

    // Page
    pageTitle: params.dt,
    referrer: params.dr && params.dr !== "" ? params.dr : undefined,

    // Session / visitor
    sessionId: params.sid,
    visitorId: params.cid,

    // Request metadata
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"],

    // Device info (UA-parsed)
    ...deviceInfo,

    // Display
    screenResolution: params.sr,
    viewportSize: params.vp,
    userLanguage: params.ul,

    // Custom event data
    eventProperties: params.ep as Record<string, unknown> | undefined,

    // Timestamps
    timestamp,
    receivedAt: now,
  } as ParsedEvent;
}
