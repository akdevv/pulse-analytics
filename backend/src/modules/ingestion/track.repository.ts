import { prisma } from "@/config/prisma.ts";
import type { ParsedEvent } from "@/types/event.ts";
import logger from "@/utils/logger.ts";

export async function getSiteByTrackingId(trackingId: string) {
  return await prisma.site.findFirst({
    where: {
      trackingId: trackingId,
      isActive: true,
    },
    select: {
      id: true,
      domain: true,
      rateLimitTier: true,
      isActive: true,
    },
  });
}

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
      country: event.country,
      countryCode: event.countryCode,
      city: event.city,
      region: event.region,
      screenResolution: event.screenResolution,
      viewportSize: event.viewportSize,
      userLanguage: event.userLanguage,
      eventProperties: event.eventProperties ?? undefined,
      timestamp: event.timestamp,
      receivedAt: event.receivedAt,
    },
  });
}

export async function insertManyEvents(events: ParsedEvent[]): Promise<void> {
  if (events.length === 0) return;

  const startTime = performance.now();

  await prisma.event.createMany({
    data: events.map((event: ParsedEvent) => ({
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
      country: event.country,
      countryCode: event.countryCode,
      city: event.city,
      region: event.region,
      screenResolution: event.screenResolution,
      viewportSize: event.viewportSize,
      userLanguage: event.userLanguage,
      eventProperties: event.eventProperties ?? undefined,
      timestamp: event.timestamp,
      receivedAt: event.receivedAt,
    })),
    skipDuplicates: true, // safety net, if duplicate events then skip
  });

  const elapsed = (performance.now() - startTime).toFixed(2);
  logger.info(`[repository] inserted ${events.length} events in ${elapsed}ms`);
}
