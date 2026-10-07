import type {
  DeviceStats,
  EventStat,
  GeoStat,
  OverviewStats,
  PageStat,
  PropertyStat,
  RealtimeStats,
  ReferrerStat,
  TimeseriesPoint,
} from "@/lib/types/analytics.types";
import type { Site } from "@/lib/types/site.types";
import type { User } from "@/lib/types/user.types";

type Weights = [label: string, weight: number][];

type Profile = {
  seed: number;
  peakPerHour: number;
  utcOffset: number;
  pages: Weights;
  referrers: Weights;
  devices: Weights;
  browsers: Weights;
  os: Weights;
  countries: Weights;
  events: Weights;
  properties: Record<string, Record<string, Weights>>;
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const STORE: Profile = {
  seed: 7,
  peakPerHour: 420,
  utcOffset: -5,
  pages: [
    ["/", 30],
    ["/products", 17],
    ["/products/aurora-lamp", 11],
    ["/products/nimbus-chair", 8],
    ["/cart", 7],
    ["/blog/spring-collection", 6],
    ["/checkout", 4.5],
    ["/about", 3],
    ["/products/halo-mirror", 2.6],
    ["/shipping", 1.4],
  ],
  referrers: [
    ["google.com", 38],
    ["", 24],
    ["instagram.com", 12],
    ["news.ycombinator.com", 7],
    ["reddit.com", 5],
    ["duckduckgo.com", 4],
    ["x.com", 3.5],
    ["bing.com", 3],
    ["pinterest.com", 2.2],
    ["newsletter.acme.store", 1.3],
  ],
  devices: [
    ["desktop", 51],
    ["mobile", 44],
    ["tablet", 5],
  ],
  browsers: [
    ["Chrome", 54],
    ["Safari", 28],
    ["Firefox", 7],
    ["Edge", 6],
    ["Samsung Internet", 3],
    ["Opera", 2],
  ],
  os: [
    ["iOS", 27],
    ["Windows", 26],
    ["macOS", 22],
    ["Android", 19],
    ["Linux", 4],
    ["ChromeOS", 2],
  ],
  countries: [
    ["us", 41],
    ["gb", 11],
    ["de", 8],
    ["ca", 7],
    ["in", 6.5],
    ["fr", 5],
    ["au", 4.5],
    ["nl", 3],
    ["br", 2.6],
    ["jp", 2.2],
  ],
  events: [
    ["add_to_cart", 5.2],
    ["checkout_started", 2.1],
    ["newsletter_signup", 1.4],
    ["purchase", 1.1],
  ],
  properties: {
    add_to_cart: {
      product: [
        ["aurora-lamp", 44],
        ["nimbus-chair", 31],
        ["halo-mirror", 17],
        ["drift-rug", 8],
      ],
      variant: [
        ["sand", 52],
        ["charcoal", 36],
        ["sage", 12],
      ],
    },
    checkout_started: {
      payment: [
        ["card", 61],
        ["apple_pay", 24],
        ["paypal", 15],
      ],
    },
    newsletter_signup: {
      source: [
        ["footer", 48],
        ["popup", 37],
        ["blog", 15],
      ],
    },
    purchase: {
      currency: [
        ["USD", 72],
        ["EUR", 18],
        ["GBP", 10],
      ],
    },
  },
};

const DOCS: Profile = {
  seed: 31,
  peakPerHour: 150,
  utcOffset: 1,
  pages: [
    ["/docs/quickstart", 24],
    ["/docs/installation", 19],
    ["/", 15],
    ["/docs/events", 12],
    ["/docs/reference", 10],
    ["/docs/how-it-works", 8],
    ["/blog/why-cookieless", 6],
    ["/changelog", 3.5],
    ["/docs/self-hosting", 2.5],
  ],
  referrers: [
    ["", 31],
    ["github.com", 27],
    ["google.com", 22],
    ["news.ycombinator.com", 9],
    ["dev.to", 5],
    ["reddit.com", 4],
    ["stackoverflow.com", 2],
  ],
  devices: [
    ["desktop", 82],
    ["mobile", 16],
    ["tablet", 2],
  ],
  browsers: [
    ["Chrome", 58],
    ["Firefox", 19],
    ["Safari", 15],
    ["Edge", 6],
    ["Arc", 2],
  ],
  os: [
    ["macOS", 41],
    ["Windows", 27],
    ["Linux", 21],
    ["iOS", 6],
    ["Android", 5],
  ],
  countries: [
    ["us", 29],
    ["de", 14],
    ["in", 12],
    ["gb", 9],
    ["fr", 6],
    ["nl", 5],
    ["pl", 4],
    ["br", 4],
    ["ca", 3.5],
  ],
  events: [
    ["copy_snippet", 6.5],
    ["search", 4],
    ["outbound_github", 2.4],
  ],
  properties: {
    copy_snippet: {
      language: [
        ["html", 58],
        ["tsx", 27],
        ["bash", 15],
      ],
    },
    search: {
      query: [
        ["custom events", 22],
        ["next.js", 19],
        ["spa routing", 14],
        ["self host", 11],
      ],
    },
    outbound_github: {
      target: [
        ["repo", 70],
        ["releases", 30],
      ],
    },
  },
};

const PROFILES: Record<string, Profile> = {
  "demo-store": STORE,
  "demo-docs": DOCS,
};

function rand(seed: number, n: number) {
  let t = (seed * 0x9e3779b1 + n * 0x85ebca6b) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function hourly(p: Profile, at: number) {
  const date = new Date(at + p.utcOffset * HOUR);
  const h = date.getUTCHours();
  const weekend = date.getUTCDay() % 6 === 0;
  const curve =
    0.15 +
    0.7 * Math.exp(-((h - 13) ** 2) / 26) +
    0.3 * Math.exp(-((h - 20) ** 2) / 10);
  const noise = 0.88 + 0.24 * rand(p.seed, Math.floor(at / HOUR));
  const pageviews = Math.round(
    p.peakPerHour * curve * (weekend ? 0.7 : 1) * noise
  );
  const sessions = Math.round(
    pageviews * (0.4 + 0.06 * rand(p.seed + 1, Math.floor(at / HOUR)))
  );
  return { pageviews, sessions };
}

function hoursBetween(from: number, to: number) {
  const hours: number[] = [];
  for (let t = Math.ceil(from / HOUR) * HOUR; t <= to; t += HOUR) hours.push(t);
  return hours;
}

function spread(total: number, weights: Weights, seed: number, limit = 10) {
  const jittered = weights.map(
    ([label, w], i) => [label, w * (0.88 + 0.24 * rand(seed, i))] as const
  );
  const sum = jittered.reduce((s, [, w]) => s + w, 0);
  return jittered
    .map(([label, w]) => ({ label, value: Math.round((total * w) / sum) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

type Range = {
  from: string;
  to: string;
  interval?: "hour" | "day";
  limit?: number;
};

const rangeSeed = (r: Range) => Math.floor(new Date(r.from).getTime() / DAY);

export function timeseries(siteId: string, r: Range): TimeseriesPoint[] {
  const p = PROFILES[siteId];
  const from = new Date(r.from).getTime();
  const to = Math.min(new Date(r.to).getTime(), Date.now());
  if (!p) return [];

  const points = new Map<number, TimeseriesPoint>();
  for (const t of hoursBetween(from, to)) {
    const key = r.interval === "day" ? Math.floor(t / DAY) * DAY : t;
    const { pageviews, sessions } = hourly(p, t);
    const point = points.get(key) ?? {
      time: new Date(key).toISOString(),
      pageviews: 0,
      sessions: 0,
    };
    point.pageviews += pageviews;
    point.sessions += sessions;
    points.set(key, point);
  }
  return [...points.values()];
}

export function overview(siteId: string, r: Range): OverviewStats {
  let totalPageviews = 0;
  let totalSessions = 0;
  for (const point of timeseries(siteId, { ...r, interval: "hour" })) {
    totalPageviews += point.pageviews;
    totalSessions += point.sessions;
  }
  return {
    totalPageviews,
    totalSessions,
    totalVisitors: Math.round(totalSessions * 0.78),
  };
}

function ranked(
  siteId: string,
  r: Range,
  pick: (p: Profile) => Weights,
  salt: number
) {
  const p = PROFILES[siteId];
  if (!p) return [];
  const total = overview(siteId, r).totalPageviews;
  return spread(total, pick(p), rangeSeed(r) + salt, r.limit ?? 10);
}

export const pages = (siteId: string, r: Range): PageStat[] =>
  ranked(siteId, r, (p) => p.pages, 1).map((x) => ({
    page: x.label,
    pageviews: x.value,
  }));

export const referrers = (siteId: string, r: Range): ReferrerStat[] =>
  ranked(siteId, r, (p) => p.referrers, 2).map((x) => ({
    source: x.label,
    pageviews: x.value,
  }));

export const geo = (siteId: string, r: Range): GeoStat[] =>
  ranked(siteId, r, (p) => p.countries, 3).map((x) => ({
    country: x.label,
    pageviews: x.value,
  }));

export function devices(siteId: string, r: Range): DeviceStats {
  return {
    devices: ranked(siteId, r, (p) => p.devices, 4).map((x) => ({
      device: x.label,
      pageviews: x.value,
    })),
    browsers: ranked(siteId, r, (p) => p.browsers, 5).map((x) => ({
      browser: x.label,
      pageviews: x.value,
    })),
    os: ranked(siteId, r, (p) => p.os, 6).map((x) => ({
      os: x.label,
      pageviews: x.value,
    })),
  };
}

export function events(siteId: string, r: Range): EventStat[] {
  const p = PROFILES[siteId];
  if (!p) return [];
  const total = overview(siteId, r).totalPageviews;
  return p.events
    .map(([eventName, perHundred], i) => {
      const count = Math.round(
        (total * perHundred * (0.9 + 0.2 * rand(rangeSeed(r), i))) / 100
      );
      return { eventName, count, visitors: Math.round(count * 0.83) };
    })
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function eventProperties(
  siteId: string,
  name: string,
  r: Range
): PropertyStat[] {
  const p = PROFILES[siteId];
  const count = events(siteId, r).find((e) => e.eventName === name)?.count;
  if (!p || !count) return [];
  return Object.entries(p.properties[name] ?? {}).flatMap(([key, values], i) =>
    spread(count, values, rangeSeed(r) + i).map((v) => ({
      key,
      value: v.label,
      count: v.value,
      distinctValues: values.length,
    }))
  );
}

export function realtime(siteId: string, tick: number): RealtimeStats {
  const p = PROFILES[siteId];
  if (!p) {
    return {
      activeSessions: 0,
      pageviews: 0,
      visitors: 0,
      activePages: [],
      topReferrers: [],
      events: [],
    };
  }
  const base = Math.max(hourly(p, Date.now()).sessions / 4, p.peakPerHour / 30);
  const activeSessions = Math.round(
    base * (0.75 + 0.5 * rand(p.seed + 9, tick))
  );
  const pick = (w: Weights, salt: number, limit: number) =>
    spread(activeSessions, w, tick * 13 + salt, limit);

  return {
    activeSessions,
    pageviews: Math.round(activeSessions * 2.4),
    visitors: Math.round(activeSessions * 0.92),
    activePages: pick(p.pages, 1, 6).map((x) => ({
      path: x.label,
      activeSessions: x.value,
      pageviews: Math.round(x.value * 2.2),
    })),
    topReferrers: pick(p.referrers, 2, 5).map((x) => ({
      referrer: x.label || null,
      activeSessions: x.value,
    })),
    events: pick(p.events, 3, 4).map((x) => ({
      name: x.label,
      count: Math.max(1, Math.round(x.value / 3)),
    })),
  };
}

const created = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * DAY).toISOString();

export const DEMO_USER: User = {
  id: "demo-user",
  name: "Demo User",
  email: "demo@pulse.dev",
  isVerified: true,
  lastLoginAt: new Date(),
};

export const DEMO_SITES: Site[] = [
  {
    id: "demo-store",
    name: "Acme Store",
    domain: "acme.store",
    userId: DEMO_USER.id,
    trackingId: "pk-3f9a2c7e51d84b06a9e2c4f18d7b5a30",
    rateLimitTier: "PRO",
    isActive: true,
    createdAt: created(120),
    updatedAt: created(9),
  },
  {
    id: "demo-docs",
    name: "Pulse Docs",
    domain: "docs.pulse.dev",
    userId: DEMO_USER.id,
    trackingId: "pk-81c4e0b7a2f94d3c8e6b1a05f7d29c64",
    rateLimitTier: "FREE",
    isActive: true,
    createdAt: created(64),
    updatedAt: created(21),
  },
];
