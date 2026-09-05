export enum EventType {
  PAGEVIEW = "PAGEVIEW",
  CLICK = "CLICK",
  CUSTOM = "CUSTOM",
}

export interface TrackEventPayload {
  trackingId: string;
  eventType: EventType;

  url: string;
  pageTitle?: string;
  referrer?: string;

  sessionId?: string;
  visitorId?: string;

  eventName?: string;
  eventProperties?: Record<string, unknown>;

  timestamp?: Date;
}

export interface BaseEvent {
  siteId: string;
  eventId: string;
  eventType: EventType;
  eventName: string | null;

  url: string;
  urlHostname: string;
  urlPathname: string;
  urlSearch: string | null;

  pageTitle: string | null;
  referrer: string | null;

  sessionId: string | null;
  visitorId: string | null;

  userAgent: string | null;

  screenResolution: string | null;
  viewportSize: string | null;
  userLanguage: string | null;

  eventProperties?: any;

  timestamp: Date; // client-reported, or server time if absent
  receivedAt: Date; // always server time
}

export interface DeviceInfo {
  deviceType: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
}

export interface GeoInfo {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
}

// The worker needs the IP for geo, then drops it. Leaving it off ParsedEvent,
// which the repository writes, makes storing one a type error.
export type RawEvent = BaseEvent & { ipAddress: string | null };
export type ParsedEvent = BaseEvent & DeviceInfo & GeoInfo;
