import { prisma } from "@/config/prisma.ts";
import type { ParsedEvent } from "@/types/event.ts";

export async function insertEvent(event: ParsedEvent): Promise<void> {
  await prisma.event.create({
    data: {
      siteId: event.siteId,
      eventId: event.eventId,
      eventType: event.eventType,
      eventName: event.eventName,
      url: event.url,
      urlHostname: event.urlHostname,
      urlPathname: event.urlPathname,
      urlSearch: event.urlSearch,
      pageTitle: event.pageTitle,
      referrer: event.referrer,
      sessionId: event.sessionId,
      visitorId: event.visitorId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      deviceType: event.deviceType,
      browser: event.browser,
      browserVersion: event.browserVersion,
      os: event.os,
      osVersion: event.osVersion,
      screenResolution: event.screenResolution,
      viewportSize: event.viewportSize,
      userLanguage: event.userLanguage,
      eventProperties: event.eventProperties ?? undefined,
      timestamp: event.timestamp,
      receivedAt: event.receivedAt,
    },
  });
}
