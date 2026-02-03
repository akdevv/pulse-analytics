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
  eventName?: string;

  // URL components
  url: string;
  urlHostname: string;
  urlPathname: string;
  urlSearch?: string;

  // Page info
  pageTitle?: string;
  referrer?: string;

  // Session & visitor
  sessionId?: string;
  visitorId?: string;

  // Request metadata
  ipAddress?: string;
  userAgent?: string;

  // Parsed device info
  deviceType?: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;

  // Custom data
  eventProperties?: any;

  // Timestamps
  timestamp: Date;
}

export interface DeviceInfo {
  deviceType: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
}
