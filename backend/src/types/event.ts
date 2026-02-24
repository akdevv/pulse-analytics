export enum EventType {
  PAGEVIEW = "PAGEVIEW",
  CLICK = "CLICK",
  CUSTOM = "CUSTOM",
}

export interface TrackEventPayload {
  trackingId: string;
  eventType: EventType;

  // Page info
  url: string;
  pageTitle?: string;
  referrer?: string;

  // Session & Visitor
  sessionId?: string;
  visitorId?: string;

  // Custom Events
  eventName?: string;
  eventProperties?: Record<string, unknown>;

  timestamp?: Date;
}

export interface ParsedEvent {
  siteId: string;
  eventId: string;
  eventType: EventType;
  eventName: string | null;

  // URL components
  url: string;
  urlHostname: string;
  urlPathname: string;
  urlSearch: string | null;

  // Page info
  pageTitle: string | null;
  referrer: string | null;

  // Session & visitor
  sessionId: string | null;
  visitorId: string | null;

  // Request metadata
  ipAddress: string | null;
  userAgent: string | null;

  // Parsed device info
  deviceType: string | null;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;

  // display
  screenResolution: string | null;
  viewportSize: string | null;
  userLanguage: string | null;

  // Custom data
  eventProperties?: any;

  // Timestamps
  timestamp: Date; // client-reported or server time
  receivedAt: Date; // always server time — when we received it
}

export interface DeviceInfo {
  deviceType: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
}
