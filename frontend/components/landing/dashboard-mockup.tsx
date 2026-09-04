"use client";

import { useMemo, useState } from "react";
import { ACCENT, ACCENT_SOFT, BG, DISPLAY, POWDER, SURFACE_1, SURFACE_2 } from "./tokens";
import { PulseLogo } from "./shared";

/* ── Series ────────────────────────────────────────────────────
   Every figure on the panel is derived from these curves rather than
   typed in beside them: the totals are the integral of the line, the
   deltas are this window over the last one, and the page and referrer
   rows are fractions of those totals. Switch the range and the whole
   panel stays true to itself, which is the part fake dashboards miss. */
const WEEKDAY = [1.0, 1.05, 1.1, 1.14, 0.97, 0.6, 0.56]; // Mon…Sun
const CHART_W = 720;
const CHART_H = 300;

function jitter(seed: number, i: number) {
  let t = (seed + i * 0x9e3779b9) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296 - 0.5;
}

/** `perDay` samples a day: 12 gives the two-hourly detail a week deserves,
 *  1 gives the daily bars a quarter does. `dayOffset` lines the weekend
 *  dip up with the real calendar day the range starts on. */
function series(
  seed: number,
  n: number,
  perDay: number,
  dayOffset: number,
  base: number,
  growth: number
) {
  return Array.from({ length: n }, (_, i) => {
    const day = Math.floor(i / perDay);
    const hour = perDay === 1 ? 14 : (i % perDay) * (24 / perDay);
    /* gaussian around 14:00 with a floor for overnight traffic */
    const diurnal =
      perDay === 1 ? 1 : 0.26 + 0.74 * Math.exp(-Math.pow((hour - 14) / 6.2, 2));
    const trend = 1 + growth * (i / (n - 1));
    return Math.max(
      6,
      base *
        diurnal *
        WEEKDAY[(day + dayOffset) % 7] *
        trend *
        (1 + jitter(seed, i) * 0.18)
    );
  });
}

/** Catmull-Rom through every sample, converted to cubic beziers — keeps
 *  the curve continuous instead of the polyline-with-round-joins that
 *  gives most fake charts away. */
function chartPath(values: number[], yMax: number) {
  const pts = values.map<[number, number]>((v, i) => [
    (i / (values.length - 1)) * CHART_W,
    (1 - v / yMax) * CHART_H,
  ]);

  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d +=
      ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}` +
      ` ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}` +
      ` ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Built from a fixed start date, never from `Date.now()` — the server and
 *  the client have to agree on every label. */
function dayStamps(y: number, m: number, d: number, n: number) {
  const cursor = new Date(Date.UTC(y, m, d));
  return Array.from({ length: n }, () => {
    const label = `${MONTHS[cursor.getUTCMonth()]} ${cursor.getUTCDate()}`;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    return label;
  });
}

const int = (n: number) => Math.round(n).toLocaleString("en-US");
const tick = (n: number) =>
  n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : `${Math.round(n)}`;

/** Three gridlines on a round step, with room left above the peak. Runs
 *  for the filtered series too, which is why the steps are fine-grained:
 *  a page worth 12% of traffic still deserves an axis that fits it. */
function niceScale(max: number) {
  const raw = max / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(
    (m) => m * mag >= raw
  ) ?? 10) * mag;
  return { yMax: step * 3.4, ticks: [step * 3, step * 2, step, 0] };
}

/* Shares hold across every range: the split of traffic doesn't change
   just because you looked at three months of it. */
const PAGE_SHARE = [
  { label: "/docs/quickstart", of: 0.1744 },
  { label: "/pricing", of: 0.1252 },
  { label: "/", of: 0.1019 },
  { label: "/docs/api", of: 0.0664 },
  { label: "/changelog", of: 0.0389 },
  { label: "/blog/scaling-timescale", of: 0.0249 },
];
const REFERRER_SHARE = [
  { label: "Direct / None", of: 0.38 },
  { label: "google.com", of: 0.255 },
  { label: "github.com", of: 0.142 },
  { label: "news.ycombinator.com", of: 0.097 },
  { label: "x.com", of: 0.079 },
  { label: "reddit.com", of: 0.047 },
];

function rows(share: typeof PAGE_SHARE, total: number) {
  const top = share[0].of;
  return share.map(({ label, of }) => ({
    label,
    hits: int(total * of),
    share: of / top,
  }));
}

type Preset = "7D" | "30D" | "90D";

function buildView(cfg: {
  seed: number;
  prevSeed: number;
  n: number;
  perDay: number;
  dayOffset: number;
  base: number;
  prevBase: number;
  growth: number;
  prevGrowth: number;
  buckets: string[];
  stamps: string[];
  cadence: string;
}) {
  const cur = series(cfg.seed, cfg.n, cfg.perDay, cfg.dayOffset, cfg.base, cfg.growth);
  const prev = series(
    cfg.prevSeed,
    cfg.n,
    cfg.perDay,
    cfg.dayOffset,
    cfg.prevBase,
    cfg.prevGrowth
  );

  /* each sample stands for the hours between it and the next one */
  const span = cfg.perDay === 1 ? 1 : 24 / cfg.perDay;
  const total = (a: number[]) => a.reduce((x, y) => x + y, 0) * span;
  const pageviews = total(cur);
  const lift = (pageviews / total(prev) - 1) * 100;
  const sessions = pageviews / 2.65;
  const visitors = sessions / 1.417;

  let peak = 0;
  for (let i = 1; i < cur.length; i++) if (cur[i] > cur[peak]) peak = i;

  return {
    values: cur,
    prevValues: prev,
    buckets: cfg.buckets,
    stamps: cfg.stamps,
    cadence: cfg.cadence,
    peak,
    metrics: [
      { label: "Pageviews", value: int(pageviews), delta: lift },
      { label: "Sessions", value: int(sessions), delta: lift + 3.8 },
      { label: "Unique visitors", value: int(visitors), delta: lift + 5.6 },
    ],
    pages: rows(PAGE_SHARE, pageviews),
    referrers: rows(REFERRER_SHARE, sessions),
  };
}

/* Anchored to Sun 23 Aug 2026, so each window starts on the weekday its
   weekend dips actually fall on. */
const VIEWS: Record<Preset, ReturnType<typeof buildView>> = {
  "7D": buildView({
    seed: 20260823,
    prevSeed: 991177,
    n: 84,
    perDay: 12,
    dayOffset: 0, // Mon 17 Aug
    base: 505,
    prevBase: 466,
    growth: 0.1,
    prevGrowth: 0.08,
    buckets: DAY_NAMES,
    stamps: Array.from(
      { length: 84 },
      (_, i) =>
        `${DAY_NAMES[Math.floor(i / 12)]} ${String((i % 12) * 2).padStart(2, "0")}:00`
    ),
    cadence: "per hour",
  }),
  "30D": buildView({
    seed: 31220260,
    prevSeed: 77410031,
    n: 30,
    perDay: 1,
    dayOffset: 5, // Sat 25 Jul
    base: 6360,
    prevBase: 5620,
    growth: 0.3,
    prevGrowth: 0.24,
    buckets: ["Jul 28", "Aug 3", "Aug 9", "Aug 15", "Aug 21"],
    stamps: dayStamps(2026, 6, 25, 30),
    cadence: "per day",
  }),
  "90D": buildView({
    seed: 90260526,
    prevSeed: 41330077,
    n: 90,
    perDay: 1,
    dayOffset: 1, // Tue 26 May
    base: 5560,
    prevBase: 4680,
    growth: 0.62,
    prevGrowth: 0.5,
    buckets: ["Jun 2", "Jun 17", "Jul 2", "Jul 17", "Aug 1", "Aug 16"],
    stamps: dayStamps(2026, 4, 26, 90),
    cadence: "per day",
  }),
};

/** A row the visitor pointed at. `factor` turns the window's pageview
 *  curve into that slice of it — a page keeps the pageview metric, a
 *  referrer is converted to sessions on the way. */
type Focus = { label: string; factor: number; metric: string } | null;

const PRESETS: Preset[] = ["7D", "30D", "90D"];

/* Most of the fade lands on the panel's own bottom padding; only the
   last rows ghost out, which is what keeps it reading as a dissolve
   rather than a crop. */
const PANEL_FADE =
  "linear-gradient(180deg, #000 0%, #000 80%, rgba(0,0,0,0.86) 87%, " +
  "rgba(0,0,0,0.52) 92%, rgba(0,0,0,0.2) 96.5%, transparent 100%)";
const RANGES: Record<Preset, { label: string; window: string }> = {
  "7D": { label: "last 7 days", window: "Aug 17 – Aug 23" },
  "30D": { label: "last 30 days", window: "Jul 25 – Aug 23" },
  "90D": { label: "last 90 days", window: "May 26 – Aug 23" },
};

/* Sessions started in each of the last twelve minutes. */
const REALTIME_BARS = [
  0.38, 0.52, 0.44, 0.61, 0.73, 0.58, 0.66, 0.81, 0.7, 0.92, 0.84, 1,
];

/* ── Icons ─────────────────────────────────────────────────────
   One stroke weight, one 24-unit box, drawn rather than borrowed from a
   font. The rail's routes are the app's real ones: /sites and /account,
   with a site's own Overview, Setup and Settings beneath. */
const ICON = {
  site:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3.3 9.5h17.4M3.3 14.5h17.4M12 3c-2.3 2.5-3.5 5.5-3.5 9s1.2 6.5 3.5 9c2.3-2.5 3.5-5.5 3.5-9S14.3 5.5 12 3",
  account:
    "M4.8 20v-1.2A4.8 4.8 0 0 1 9.6 14h4.8a4.8 4.8 0 0 1 4.8 4.8V20M12 11a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2",
  overview: "M4 13h3.6v7H4zM10.2 4h3.6v16h-3.6zM16.4 9H20v11h-3.6z",
  setup: "m8.5 8-4 4 4 4m7-8 4 4-4 4M13.5 4.5l-3 15",
  settings:
    "M4 7h9m3 0h4M4 17h4m3 0h9M14.5 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M12 17a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0",
  logout:
    "M15 16.5 19.5 12 15 7.5M19.5 12H9M11 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H11",
  sites: "M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z",
  chevron: "m8 10 4 4 4-4",
  panel: "M4.5 5.5h15v13h-15zM9.75 5.5v13",
  back: "m14 6-6 6 6 6",
  forward: "m10 6 6 6-6 6",
  share: "M12 3.5v10M8.5 7 12 3.5 15.5 7M6.5 11.5V19a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-7.5",
  plus: "M12 5.5v13M5.5 12h13",
  tabs: "M4.5 7h9v9h-9zM10.5 9.5h9v9h-9",
} as const;

function Icon({
  path,
  size = 15,
  color,
  className = "",
}: {
  path: string;
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      style={color ? { color } : undefined}
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

export function DashboardMockup() {
  const [preset, setPreset] = useState<Preset>("7D");
  const [focus, setFocus] = useState<Focus>(null);
  const view = VIEWS[preset];

  /* a slice of one window means nothing in the next one */
  const choosePreset = (p: Preset) => {
    setPreset(p);
    setFocus(null);
  };
  const toggle = (next: NonNullable<Focus>) =>
    setFocus((f) => (f?.label === next.label ? null : next));

  return (
    <div className="relative">
      {/* floor glow — grounds the panel against the spotlight behind it */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 top-1/2 -bottom-16 opacity-[0.16] blur-[110px]"
        style={{
          background: `radial-gradient(ellipse 55% 70% at 50% 100%, ${ACCENT} 0%, transparent 72%)`,
        }}
      />

      {/* 16:10 is the laptop this gets used on, held from xl up where the
          panel is wide enough for it. And the panel doesn't end so much
          as dissolve: the mask takes the border, the corners and the
          last rows with it, so the screenshot melts into the glow and
          the pulse line below instead of stopping at an edge. */}
      <div
        className="relative flex flex-col overflow-hidden rounded-2xl border border-ink/10 pb-8 xl:aspect-[16/10]"
        style={{
          background: SURFACE_1,
          boxShadow:
            "0 1px 0 0 rgba(229,227,210,0.06) inset, 0 50px 100px -30px rgba(0,0,0,0.88)",
          maskImage: PANEL_FADE,
          WebkitMaskImage: PANEL_FADE,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 z-10 h-px"
          style={{
            background: `linear-gradient(90deg, transparent 12%, ${ACCENT} 50%, transparent 88%)`,
            opacity: 0.32,
          }}
        />

        <SafariChrome />

        <div className="flex min-h-0 flex-1">
          <Sidebar />

          <main className="flex min-w-0 flex-1 flex-col">
            <AppHeader preset={preset} onPreset={choosePreset} />
            <Metrics view={view} charted={focus?.metric ?? "Pageviews"} />

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-ink/8 lg:grid-cols-[1.58fr_1fr]">
              <TrafficChart
                view={view}
                range={RANGES[preset].label}
                focus={focus}
                onClear={() => setFocus(null)}
              />
              <div className="grid min-h-0 grid-cols-1 gap-px bg-ink/8 lg:grid-rows-2">
                <BarPanel
                  title="Top pages"
                  unit="views"
                  rows={view.pages}
                  shares={PAGE_SHARE}
                  metric="Pageviews"
                  scale={1}
                  focus={focus}
                  onPick={toggle}
                />
                <BarPanel
                  title="Referrers"
                  unit="sessions"
                  rows={view.referrers}
                  shares={REFERRER_SHARE}
                  metric="Sessions"
                  scale={1 / 2.65}
                  focus={focus}
                  onPick={toggle}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/* ── Safari ────────────────────────────────────────────────────
   One unified toolbar, because that is all Safari shows with a single
   tab open: lights, sidebar, history, a narrow centred address field,
   then share, new tab, tab overview. */
function SafariChrome() {
  const lights = ["#FF5F57", "#FEBC2E", "#28C840"];
  return (
    <div
      className="flex shrink-0 items-center gap-3 border-b border-ink/10 px-4 py-3"
      style={{
        background: SURFACE_2,
        boxShadow: "0 1px 0 0 rgba(229,227,210,0.05) inset",
      }}
    >
      <div className="flex gap-2">
        {lights.map((c) => (
          <span
            key={c}
            className="h-3 w-3 rounded-full"
            style={{
              background: c,
              boxShadow: "0 0 0 0.5px rgba(0,0,0,0.3) inset",
            }}
          />
        ))}
      </div>

      <div className="ml-1 flex items-center gap-3 text-ink/45">
        <Icon path={ICON.panel} size={16} />
        <span className="h-4 w-px bg-ink/10" />
        <Icon path={ICON.back} size={16} />
        <Icon path={ICON.forward} size={16} className="opacity-35" />
      </div>

      <div className="flex min-w-0 flex-1 justify-center">
        <div className="flex h-[26px] w-full max-w-[440px] items-center justify-center gap-1.5 rounded-md border border-ink/8 bg-ink/[0.05] px-3 shadow-[0_1px_2px_0_rgba(0,0,0,0.18)_inset]">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0 text-ink/45"
            aria-hidden
          >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M7.5 11V7a4.5 4.5 0 0 1 9 0v4" />
          </svg>
          <span className="truncate text-[12px] text-ink/70">
            app.pulseanalytics.io
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-ink/40">
        <Icon path={ICON.share} size={16} />
        <Icon path={ICON.plus} size={16} />
        <Icon path={ICON.tabs} size={16} />
      </div>
    </div>
  );
}

/* ── Sidebar ───────────────────────────────────────────────────
   Darker than the content beside it, the way a macOS rail is. Five
   routes, all of which exist in the app: the site you are looking at
   first, then the workspace, split by a hairline instead of a pair of
   group headings that cost more than they explain. */
function Sidebar() {
  return (
    <aside
      className="hidden w-[198px] shrink-0 flex-col border-r border-ink/8 md:flex"
      style={{ background: BG }}
    >
      <div className="flex items-center gap-2.5 px-4 py-4">
        <PulseLogo size={21} />
        <span className="truncate text-[13px] font-semibold tracking-[-0.02em] text-ink">
          Pulse Analytics
        </span>
      </div>

      <div className="px-3">
        <div
          className="flex items-center gap-2 rounded-md px-2.5 py-2"
          style={{ background: SURFACE_1 }}
        >
          <Icon path={ICON.site} size={13} className="text-ink/40" />
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink/80">
            pulseanalytics.io
          </span>
          <Icon path={ICON.chevron} size={12} className="text-ink/35" />
        </div>
      </div>

      <nav className="mt-4 flex flex-col gap-0.5 px-3">
        <NavItem icon={ICON.overview} label="Overview" active />
        <NavItem icon={ICON.setup} label="Setup" />
        <NavItem icon={ICON.settings} label="Settings" />
        <span aria-hidden className="my-2.5 h-px bg-ink/8" />
        <NavItem icon={ICON.sites} label="Sites" />
        <NavItem icon={ICON.account} label="Account" />
      </nav>

      <div className="mt-auto flex items-center gap-2.5 px-4 py-4">
        <span
          className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full font-mono text-[10px] font-semibold"
          style={{
            background: "rgba(229,227,210,0.07)",
            color: "rgba(229,227,210,0.7)",
          }}
        >
          AK
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-ink/70">
          akdevv
        </span>
        <Icon path={ICON.logout} size={14} className="text-ink/30" />
      </div>
    </aside>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[12px] ${
        active ? "text-ink" : "text-ink/50"
      }`}
      style={active ? { background: SURFACE_2 } : undefined}
    >
      {active && (
        <span
          className="absolute top-1/2 left-0 h-[14px] w-[2px] -translate-y-1/2 rounded-full"
          style={{ background: ACCENT }}
        />
      )}
      <Icon path={icon} size={14} color={active ? ACCENT : undefined} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </span>
  );
}

function AppHeader({
  preset,
  onPreset,
}: {
  preset: Preset;
  onPreset: (p: Preset) => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-ink/8 px-5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-[14px] font-medium tracking-[-0.01em] text-ink">
          Overview
        </span>
        <span className="h-3.5 w-px bg-ink/12" />
        <span className="truncate font-mono text-[11px] text-ink/45">
          {RANGES[preset].window}
        </span>
      </div>

      <div
        className="flex shrink-0 items-center gap-0.5 rounded-lg border border-ink/8 p-0.5"
        role="group"
        aria-label="Date range"
      >
        {PRESETS.map((p) => {
          const on = p === preset;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPreset(p)}
              aria-pressed={on}
              className={`cursor-pointer rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors duration-150 ease-[var(--ease-out)] ${
                on
                  ? "text-charcoal"
                  : "text-ink/45 hover:bg-ink/[0.05] hover:text-ink/90"
              }`}
              style={on ? { background: ACCENT } : undefined}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Metrics({
  view,
  charted,
}: {
  view: ReturnType<typeof buildView>;
  charted: string;
}) {
  return (
    <div className="grid shrink-0 grid-cols-2 gap-px bg-ink/8 lg:grid-cols-4">
      {view.metrics.map(({ label, value, delta }) => (
        <Cell key={label} label={label} value={value} lit={label === charted}>
          <Delta value={delta} />
        </Cell>
      ))}

      {/* The one figure here that isn't a window total, so it reads in
          telemetry blue and shows its own last twelve minutes instead
          of a comparison it doesn't have. */}
      <Cell label="Active now" value="247" tone={POWDER} pip>
        <div className="flex h-full items-end gap-[3px]">
          {REALTIME_BARS.map((h, i) => (
            <span
              key={i}
              className="pa-bar-rise w-[3px] rounded-[1px]"
              style={{
                height: `${h * 100}%`,
                background: POWDER,
                opacity: 0.22 + h * 0.42,
                ["--pa-delay" as string]: `${700 + i * 45}ms`,
              }}
            />
          ))}
        </div>
      </Cell>
    </div>
  );
}

/* All four cells share one skeleton, so the row keeps its rhythm whether
   the last line is a comparison or a set of bars. */
function Cell({
  label,
  value,
  children,
  tone,
  lit = false,
  pip = false,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
  tone?: string;
  lit?: boolean;
  pip?: boolean;
}) {
  return (
    <div className="relative px-5 py-4" style={{ background: SURFACE_1 }}>
      {lit && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: ACCENT }}
        />
      )}
      <div
        className={`flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] whitespace-nowrap uppercase ${
          lit ? "text-ink/70" : "text-ink/45"
        }`}
      >
        {pip && <LivePip />}
        {label}
      </div>
      <div
        className="mt-3 text-[27px] leading-none whitespace-nowrap tabular-nums"
        style={{
          ...DISPLAY,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          color: tone ?? "var(--color-ink)",
        }}
      >
        {value}
      </div>
      <div className="mt-2.5 flex h-5 items-end">{children}</div>
    </div>
  );
}

/* ── Traffic chart ─────────────────────────────────────────────
   Axis labels sit in HTML at the same fractions the gridlines use, so
   the scale is genuinely aligned to the curve. Pointing at the plot
   reads the nearest sample; leaving it returns to the window's peak.
   A focused row rescales the whole thing rather than squashing the
   slice against the floor. */
function TrafficChart({
  view,
  range,
  focus,
  onClear,
}: {
  view: ReturnType<typeof buildView>;
  range: string;
  focus: Focus;
  onClear: () => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const factor = focus?.factor ?? 1;

  const plot = useMemo(() => {
    const values = view.values.map((v) => v * factor);
    const prevValues = view.prevValues.map((v) => v * factor);
    const { yMax, ticks } = niceScale(
      Math.max(...values, ...prevValues)
    );
    return {
      values,
      prevValues,
      yMax,
      ticks,
      path: chartPath(values, yMax),
      prevPath: chartPath(prevValues, yMax),
    };
  }, [view, factor]);

  const n = plot.values.length;
  const at = Math.min(hover ?? view.peak, n - 1);
  const x = (at / (n - 1)) * 100;
  const y = (1 - plot.values[at] / plot.yMax) * 100;
  const yPrev = (1 - plot.prevValues[at] / plot.yMax) * 100;
  /* the callout flips sides rather than walking off the plot */
  const flip = x > 60;

  return (
    <div
      className="flex min-h-0 min-w-0 flex-col px-5 py-4"
      style={{ background: SURFACE_1 }}
    >
      <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[13px] text-ink/90">
              {focus?.metric ?? "Pageviews"}
            </span>
            {focus && (
              <button
                type="button"
                onClick={onClear}
                className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-full px-2 py-[3px] font-mono text-[10px] transition-colors duration-150 ease-[var(--ease-out)]"
                style={{
                  background: `color-mix(in oklab, ${ACCENT} 14%, transparent)`,
                  color: ACCENT,
                }}
              >
                <span className="min-w-0 truncate">{focus.label}</span>
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="shrink-0 opacity-70"
                  aria-hidden
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </div>
          <div className="mt-0.5 font-mono text-[10px] tracking-[0.12em] text-ink/45 uppercase">
            {view.cadence}
          </div>
        </div>
        <div className="flex shrink-0 gap-4 pt-0.5">
          {[
            { c: ACCENT, l: range, o: 1 },
            { c: POWDER, l: "Previous", o: 0.45 },
          ].map(({ c, l, o }) => (
            <span
              key={l}
              className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-ink/50 uppercase"
            >
              <svg width="14" height="4" viewBox="0 0 14 4" aria-hidden>
                <line
                  x1="0"
                  y1="2"
                  x2="14"
                  y2="2"
                  stroke={c}
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity={o}
                />
              </svg>
              {l}
            </span>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          <div className="relative w-9 shrink-0">
            {plot.ticks.map((t) => (
              <span
                key={t}
                className="absolute right-2 -translate-y-1/2 font-mono text-[10px] text-ink/40 tabular-nums"
                style={{ top: `${(1 - t / plot.yMax) * 100}%` }}
              >
                {tick(t)}
              </span>
            ))}
          </div>

          <div
            className="relative min-h-0 min-w-0 flex-1 cursor-crosshair"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const f = (e.clientX - r.left) / r.width;
              setHover(Math.min(n - 1, Math.max(0, Math.round(f * (n - 1)))));
            }}
            onMouseLeave={() => setHover(null)}
          >
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              role="img"
              aria-label={`${focus?.metric ?? "Pageviews"}${focus ? ` for ${focus.label}` : ""} over the ${range}, peaking at ${int(Math.max(...plot.values))}`}
            >
              <defs>
                <linearGradient id="pa-chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
                </linearGradient>
                <linearGradient id="pa-chart-line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity="0.55" />
                  <stop offset="30%" stopColor={ACCENT} />
                  <stop offset="100%" stopColor={ACCENT_SOFT} />
                </linearGradient>
              </defs>

              {plot.ticks.map((t) => (
                <line
                  key={t}
                  x1="0"
                  x2={CHART_W}
                  y1={(1 - t / plot.yMax) * CHART_H}
                  y2={(1 - t / plot.yMax) * CHART_H}
                  stroke={
                    t === 0 ? "rgba(229,227,210,0.12)" : "rgba(229,227,210,0.05)"
                  }
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              <path
                d={`${plot.path} L${CHART_W},${CHART_H} L0,${CHART_H} Z`}
                fill="url(#pa-chart-fill)"
                className="pa-fade-in"
                style={{ ["--pa-delay" as string]: "900ms" }}
              />
              <path
                d={plot.prevPath}
                fill="none"
                stroke={POWDER}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.4"
                vectorEffect="non-scaling-stroke"
                className="pa-fade-in"
                style={{ ["--pa-delay" as string]: "700ms" }}
              />
              <path
                d={plot.path}
                fill="none"
                stroke="url(#pa-chart-line)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                style={{
                  strokeDasharray: 4200,
                  strokeDashoffset: 4200,
                  animation: "pa-chart-draw 1.6s var(--ease-out) 0.15s forwards",
                  filter: "drop-shadow(0 0 8px var(--pa-accent-glow))",
                }}
              />
            </svg>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-px"
              style={{
                left: `${x}%`,
                background:
                  "linear-gradient(180deg, transparent, rgba(229,227,210,0.22) 14%, rgba(229,227,210,0.22) 94%, transparent)",
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${x}%`,
                top: `${yPrev}%`,
                background: POWDER,
                opacity: 0.55,
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                background: ACCENT,
                border: "2px solid oklch(0.2350 0 0)",
                boxShadow: "0 0 0 3px var(--pa-accent-glow)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-lg border border-ink/12 px-2.5 py-1.5 whitespace-nowrap shadow-[0_10px_24px_-10px_rgba(0,0,0,0.9)]"
              style={{
                left: `${x}%`,
                top: `${Math.min(Math.max(y, 6), 66)}%`,
                transform: flip
                  ? "translate(calc(-100% - 12px), -50%)"
                  : "translate(12px, -50%)",
                background: SURFACE_2,
              }}
            >
              <div className="font-mono text-[10px] tracking-[0.12em] text-ink/50 uppercase">
                {view.stamps[at]}
              </div>
              <div className="mt-1 flex items-center gap-3 text-[12px] tabular-nums">
                <span className="flex items-center gap-1.5 text-ink">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: ACCENT }}
                  />
                  {int(plot.values[at])}
                </span>
                <span className="flex items-center gap-1.5 text-ink/45">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: POWDER, opacity: 0.5 }}
                  />
                  {int(plot.prevValues[at])}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex shrink-0">
          <span className="w-9 shrink-0" />
          <div
            className="grid flex-1"
            style={{
              gridTemplateColumns: `repeat(${view.buckets.length}, minmax(0, 1fr))`,
            }}
          >
            {view.buckets.map((b) => (
              <span
                key={b}
                className="text-center font-mono text-[10px] tracking-[0.12em] text-ink/45 uppercase"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Bar panels ────────────────────────────────────────────────
   Share is drawn, not just counted, so the column reads at a glance.
   Each row is a real control: pointing at one reveals its share of the
   window, choosing one redraws the chart as that slice. */
function BarPanel({
  title,
  rows,
  unit,
  shares,
  metric,
  scale,
  focus,
  onPick,
}: {
  title: string;
  rows: { label: string; hits: string; share: number }[];
  unit: string;
  shares: { label: string; of: number }[];
  metric: string;
  scale: number;
  focus: Focus;
  onPick: (f: NonNullable<Focus>) => void;
}) {
  return (
    <div
      className="flex min-h-0 min-w-0 flex-col px-5 py-4"
      style={{ background: SURFACE_1 }}
    >
      <div className="mb-3 flex shrink-0 items-baseline justify-between gap-3">
        <span className="text-[13px] text-ink/90">{title}</span>
        <span className="font-mono text-[10px] tracking-[0.12em] text-ink/35 uppercase">
          {unit}
        </span>
      </div>
      <div className="flex flex-col gap-[3px]">
        {rows.map(({ label, hits, share }, i) => {
          const on = focus?.label === label;
          const dimmed = focus !== null && !on;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onPick({ label, factor: shares[i].of * scale, metric })
              }
              className={`group relative flex cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-[4px] px-2 py-[7px] text-left text-[12px] transition-opacity duration-200 ease-[var(--ease-out)] focus-visible:-outline-offset-2 ${
                dimmed ? "opacity-45 hover:opacity-100" : "opacity-100"
              }`}
            >
              <span
                aria-hidden
                className="pa-bar absolute inset-y-0 left-0 rounded-[4px] transition-[opacity,box-shadow] duration-200 ease-[var(--ease-out)]"
                style={{
                  width: `${share * 100}%`,
                  background: ACCENT,
                  opacity: on ? 0.34 : 0.09 + share * 0.1,
                  boxShadow: on
                    ? `inset 0 0 0 1px color-mix(in oklab, ${ACCENT} 55%, transparent)`
                    : undefined,
                  ["--pa-delay" as string]: `${450 + i * 60}ms`,
                }}
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-[4px] bg-ink/[0.05] opacity-0 transition-opacity duration-150 ease-[var(--ease-out)] group-hover:opacity-100"
              />
              <span
                className={`relative min-w-0 truncate font-mono ${
                  on ? "text-ink" : "text-ink/85"
                }`}
              >
                {label}
              </span>
              <span className="relative flex shrink-0 items-baseline gap-2 font-mono text-[11px] tabular-nums">
                {/* the share only earns its space once you ask for it */}
                <span
                  className={`text-ink/40 transition-opacity duration-150 ease-[var(--ease-out)] ${
                    on ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {(shares[i].of * 100).toFixed(1)}%
                </span>
                <span className={on ? "text-ink" : "text-ink/60"}>{hits}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LivePip() {
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-powder opacity-60" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-powder" />
    </span>
  );
}

/* Drawn rather than a glyph, so the arrow keeps the same stroke system
   as the rest of the panel. The comparison window is named once, in the
   chart legend, so it isn't repeated on all three cells. */
function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] leading-none tabular-nums ${
        up ? "text-powder/85" : "text-ink/50"
      }`}
    >
      <svg
        width="7"
        height="7"
        viewBox="0 0 12 12"
        fill="currentColor"
        aria-hidden
        style={up ? undefined : { transform: "rotate(180deg)" }}
      >
        <path d="M6 2.2 10.4 9.2H1.6z" />
      </svg>
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

