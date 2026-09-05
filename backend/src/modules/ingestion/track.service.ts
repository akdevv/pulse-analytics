import type { ParsedEvent, RawEvent } from "@/types/event.ts";
import type { Request } from "express";
import { v4 as uuidv4 } from "uuid";
import { extractClientIp } from "@/utils/ip.ts";
import type { TrackQueryParams } from "./track.types.ts";

// Column widths from prisma/schema.prisma, for the values no query parameter
// bounds. TrackQuerySchema caps everything the client sends explicitly.
const MAX_HOSTNAME = 255;
const MAX_PATHNAME = 1024;
const MAX_SEARCH = 1024;
const MAX_USER_AGENT = 500;

// Truncate rather than reject. A 600-char crawler User-Agent is still a real
// pageview, and an overflow would take the whole insert batch down.
const clamp = (value: string | undefined, max: number): string | undefined =>
  value === undefined ? undefined : value.slice(0, max);

function parseUrl(rawUrl: string): {
  urlHostname: string;
  urlPathname: string;
  urlSearch?: string | undefined;
} {
  try {
    const parsed = new URL(rawUrl);
    return {
      urlHostname: parsed.hostname.slice(0, MAX_HOSTNAME),
      urlPathname: parsed.pathname.slice(0, MAX_PATHNAME),
      // undefined rather than a bare "?"
      urlSearch:
        parsed.search !== "" ? parsed.search.slice(0, MAX_SEARCH) : undefined,
    };
  } catch {
    // Malformed URL. Keep what we can rather than dropping the event.
    return {
      urlHostname: "",
      urlPathname: rawUrl.slice(0, MAX_PATHNAME),
    };
  }
}

// A tracking id ships in the page source of every install, so without this
// check anyone who reads one can write into someone else's dashboard.
// Lenient on purpose: "example.com" covers www. and any subdomain, and an
// unparseable hostname passes rather than losing an already-malformed event.
export function hostnameMatchesSite(hostname: string, domain: string): boolean {
  if (hostname === "") return true;
  const strip = (h: string) => h.toLowerCase().replace(/^www\./, "");
  const host = strip(hostname);
  const site = strip(domain);
  return host === site || host.endsWith(`.${site}`);
}

export function buildRawEvent(
  params: TrackQueryParams,
  req: Request,
  siteId: string
): RawEvent {
  const now = new Date();

  const { urlHostname, urlPathname, urlSearch } = parseUrl(params.dl);

  const timestamp = params.ts ? new Date(params.ts) : now;

  return {
    siteId,
    eventId: uuidv4(), // distinct from the database row id
    eventType: params.t as ParsedEvent["eventType"],
    eventName: params.en,

    url: params.dl,
    urlHostname,
    urlPathname,
    urlSearch,

    pageTitle: params.dt,
    referrer: params.dr && params.dr !== "" ? params.dr : undefined,

    sessionId: params.sid,
    visitorId: params.cid,

    ipAddress: extractClientIp(req),
    userAgent: clamp(req.headers["user-agent"], MAX_USER_AGENT),

    screenResolution: params.sr,
    viewportSize: params.vp,
    userLanguage: params.ul,

    eventProperties: params.ep as Record<string, unknown> | undefined,

    timestamp,
    receivedAt: now,
  } as RawEvent;
}
