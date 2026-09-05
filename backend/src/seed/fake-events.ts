import { prisma } from "@/config/prisma.ts";
import { faker } from "@faker-js/faker";
import { generateTrackingId } from "@/utils/gen-tracking.ts";
import { RateLimitTier } from "@/generated/prisma/enums.ts";
import { EventType } from "@/types/event.ts";

const FAKE_EVENTS_COUNT = 50_000;
const EVENT_BATCH_SIZE = 5_000;
const TRACKING_SITE_COUNT = 5;

const END_DATE = new Date();
const START_DATE = new Date(END_DATE.getTime() - 30 * 24 * 60 * 60 * 1000);

function randomDate(start: Date, end: Date): Date {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const ts = startMs + Math.random() * (endMs - startMs);
  return new Date(ts);
}

async function getSeedSites() {
  const existing = await prisma.site.findMany({
    take: TRACKING_SITE_COUNT,
    where: {
      isActive: true,
    },
    select: {
      id: true,
      domain: true,
      trackingId: true,
    },
  });

  if (existing.length >= TRACKING_SITE_COUNT) {
    return existing;
  }

  const users = await prisma.user.findMany({ take: 1 });

  if (users.length === 0 || !users[0]) {
    throw new Error(
      "[seed] No users found. Run the main seed script before fake events seeding."
    );
  }

  const owner = users[0]!;
  const sites = [...existing];
  const toCreate = TRACKING_SITE_COUNT - existing.length;

  for (let i = 0; i < toCreate; i++) {
    const trackingId = generateTrackingId();

    const site = await prisma.site.create({
      data: {
        name: `Demo Site ${existing.length + i + 1}`,
        domain: faker.internet.domainName(),
        trackingId,
        userId: owner.id,
        rateLimitTier: RateLimitTier.FREE,
        isActive: true,
      },
      select: {
        id: true,
        domain: true,
        trackingId: true,
      },
    });

    sites.push(site);
  }

  return sites;
}

async function main() {
  console.log("[seed] Starting fake events seeding...");

  // Events only, so existing users and sites are reused.
  await prisma.event.deleteMany();
  console.log("[seed] Old events cleared.");

  const sites = await getSeedSites();
  console.log(
    "[seed] Using tracking IDs:",
    sites.map((s) => s.trackingId).join(", ")
  );

  let remaining = FAKE_EVENTS_COUNT;
  let created = 0;

  while (remaining > 0) {
    const batchSize = Math.min(EVENT_BATCH_SIZE, remaining);
    const events: any[] = [];

    for (let i = 0; i < batchSize; i++) {
      const site = faker.helpers.arrayElement(sites);
      const eventType = faker.helpers.arrayElement([
        EventType.PAGEVIEW,
        EventType.CLICK,
        EventType.CUSTOM,
      ]);

      const timestamp = randomDate(START_DATE, END_DATE);
      const receivedAt = new Date(
        timestamp.getTime() + faker.number.int({ min: 0, max: 60_000 })
      );

      const urlPathname = faker.helpers.arrayElement([
        "/",
        "/pricing",
        "/blog",
        "/docs",
        "/dashboard",
        "/login",
        "/signup",
      ]);

      const urlSearch =
        Math.random() < 0.5
          ? null
          : `?utm_source=${faker.helpers.arrayElement([
              "google",
              "twitter",
              "newsletter",
              "direct",
            ])}`;

      const fullUrl = `https://${site.domain}${urlPathname}${urlSearch ?? ""}`;
      const userAgent = faker.internet.userAgent();

      const countryCode = faker.location.countryCode();
      const country = faker.location.country();
      const city = faker.location.city();
      const region = faker.location.state();

      let eventName: string | null = null;
      let eventProperties: Record<string, unknown> | null = null;

      if (eventType === EventType.CUSTOM) {
        eventName = faker.helpers.arrayElement([
          "signup_completed",
          "plan_upgraded",
          "report_downloaded",
        ]);
        eventProperties = {
          plan: faker.helpers.arrayElement(["free", "pro", "enterprise"]),
          value: faker.number.int({ min: 10, max: 500 }),
        };
      } else if (eventType === EventType.CLICK) {
        eventName = "click";
        eventProperties = {
          selector: faker.helpers.arrayElement([
            "#signup-button",
            "#login-button",
            ".cta-primary",
          ]),
        };
      }

      events.push({
        siteId: site.id,
        eventId: faker.string.uuid(),
        eventType,
        eventName,
        url: fullUrl,
        urlHostname: site.domain,
        urlPathname,
        urlSearch,
        pageTitle: faker.lorem.sentence(),
        referrer:
          Math.random() < 0.4
            ? null
            : faker.helpers.arrayElement([
                "https://google.com",
                "https://twitter.com",
                "https://news.ycombinator.com",
              ]),
        sessionId: faker.string.uuid(),
        visitorId: faker.string.uuid(),
        // Ingestion drops the IP, so seeding one fakes a row it cannot produce.
        ipAddress: null,
        userAgent,
        deviceType: faker.helpers.arrayElement(["desktop", "mobile", "tablet"]),
        browser: faker.helpers.arrayElement([
          "Chrome",
          "Safari",
          "Firefox",
          "Edge",
        ]),
        browserVersion: faker.system.semver(),
        os: faker.helpers.arrayElement([
          "macOS",
          "Windows",
          "Linux",
          "iOS",
          "Android",
        ]),
        osVersion: faker.system.semver(),
        country,
        countryCode,
        city,
        region,
        eventProperties,
        timestamp,
        receivedAt,
        screenResolution: faker.helpers.arrayElement([
          "1920x1080",
          "1440x900",
          "1280x720",
          "2560x1440",
        ]),
        userLanguage: faker.helpers.arrayElement([
          "en-US",
          "en-GB",
          "fr-FR",
          "de-DE",
        ]),
        viewportSize: faker.helpers.arrayElement([
          "1920x900",
          "1366x768",
          "1280x800",
          "1536x864",
        ]),
      });
    }

    await prisma.event.createMany({
      data: events,
    });

    created += batchSize;
    remaining -= batchSize;

    console.log(`[seed] Inserted ${created}/${FAKE_EVENTS_COUNT} events...`);
  }

  console.log("[seed] Fake events seeding completed.");
}

main()
  .catch((e) => {
    console.error("[seed] Fake events seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
