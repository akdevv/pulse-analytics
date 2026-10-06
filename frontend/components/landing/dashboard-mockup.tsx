"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Code,
  Copy,
  Eye,
  Globe,
  LayoutGrid,
  Lock,
  LogOut,
  MousePointerClick,
  PanelLeft,
  Plus,
  RotateCw,
  Share,
  SlidersHorizontal,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PulseLogo } from "./shared";
import { HALO, RIM } from "./surfaces";

const WEEKDAY = [1.0, 1.05, 1.1, 1.14, 0.97, 0.6, 0.56]; // Mon…Sun
const CHART_W = 720;
const CHART_H = 300;

function jitter(seed: number, i: number) {
  let t = (seed + i * 0x9e3779b9) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296 - 0.5;
}

type SeriesCfg = { n: number; perDay: number; dayOffset: number };

function series(
  { n, perDay, dayOffset }: SeriesCfg,
  seed: number,
  base: number,
  growth: number
) {
  return Array.from({ length: n }, (_, i) => {
    const day = Math.floor(i / perDay);
    const hour = (i % perDay) * (24 / perDay);
    const diurnal =
      perDay === 1 ? 1 : 0.26 + 0.74 * Math.exp(-(((hour - 14) / 6.2) ** 2));
    const trend = 1 + growth * (i / (n - 1));
    const noise = 1 + jitter(seed, i) * 0.18;
    return Math.max(
      6,
      base * diurnal * WEEKDAY[(day + dayOffset) % 7] * trend * noise
    );
  });
}

/** Catmull-Rom spline through every sample, as cubic beziers. */
function chartPath(values: number[], yMax: number) {
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * CHART_W,
    (1 - v / yMax) * CHART_H,
  ]);
  const p = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;

  let d = `M${p(pts[0][0], pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d +=
      ` C${p(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)}` +
      ` ${p(p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)}` +
      ` ${p(p2[0], p2[1])}`;
  }
  return d;
}

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Fixed dates, never `Date.now()`, so server and client render the same labels.
function dayStamps(y: number, m: number, d: number, n: number) {
  const cursor = new Date(Date.UTC(y, m, d));
  return Array.from({ length: n }, () => {
    const label = `${MONTHS[cursor.getUTCMonth()]} ${cursor.getUTCDate()}`;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    return label;
  });
}

function hourStamps(days: number, perDay: number) {
  return Array.from({ length: days * perDay }, (_, i) => {
    const hour = (i % perDay) * (24 / perDay);
    return `${DAY_NAMES[Math.floor(i / perDay)]} ${String(hour).padStart(2, "0")}:00`;
  });
}

const int = (n: number) => Math.round(n).toLocaleString("en-US");
const tick = (n: number) =>
  n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : `${Math.round(n)}`;

function niceScale(max: number) {
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step =
    ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * mag >= raw) ??
      10) * mag;
  return { yMax: step * 3.4, ticks: [step * 3, step * 2, step, 0] };
}

type Share = { label: string; of: number };

const PAGE_SHARE: Share[] = [
  { label: "/docs/quickstart", of: 0.1744 },
  { label: "/pricing", of: 0.1252 },
  { label: "/", of: 0.1019 },
  { label: "/docs/api", of: 0.0664 },
  { label: "/changelog", of: 0.0389 },
  { label: "/blog/scaling-timescale", of: 0.0249 },
];
const REFERRER_SHARE: Share[] = [
  { label: "Direct / None", of: 0.38 },
  { label: "google.com", of: 0.255 },
  { label: "github.com", of: 0.142 },
  { label: "news.ycombinator.com", of: 0.097 },
  { label: "x.com", of: 0.079 },
  { label: "reddit.com", of: 0.047 },
];
const PAGES_PER_SESSION = 2.65;

type Row = Share & { hits: string; width: number };

function rows(shares: Share[], total: number): Row[] {
  const top = shares[0].of;
  return shares.map((s) => ({
    ...s,
    hits: int(total * s.of),
    width: s.of / top,
  }));
}

function buildView(cfg: {
  series: SeriesCfg;
  seed: number;
  prevSeed: number;
  base: number;
  prevBase: number;
  growth: number;
  prevGrowth: number;
  buckets: string[];
  stamps: string[];
  cadence: string;
}) {
  const cur = series(cfg.series, cfg.seed, cfg.base, cfg.growth);
  const prev = series(cfg.series, cfg.prevSeed, cfg.prevBase, cfg.prevGrowth);

  const hoursPerSample = cfg.series.perDay === 1 ? 1 : 24 / cfg.series.perDay;
  const total = (a: number[]) => a.reduce((x, y) => x + y, 0) * hoursPerSample;
  const pageviews = total(cur);
  const lift = (pageviews / total(prev) - 1) * 100;
  const sessions = pageviews / PAGES_PER_SESSION;
  const visitors = sessions / 1.417;

  return {
    values: cur,
    prevValues: prev,
    buckets: cfg.buckets,
    stamps: cfg.stamps,
    cadence: cfg.cadence,
    peak: cur.indexOf(Math.max(...cur)),
    metrics: [
      { label: "Pageviews", value: int(pageviews), delta: lift },
      { label: "Sessions", value: int(sessions), delta: lift + 3.8 },
      { label: "Unique visitors", value: int(visitors), delta: lift + 5.6 },
    ],
    pages: rows(PAGE_SHARE, pageviews),
    referrers: rows(REFERRER_SHARE, sessions),
  };
}

type View = ReturnType<typeof buildView>;
type Preset = "7D" | "30D" | "90D";
const PRESETS: Preset[] = ["7D", "30D", "90D"];

// Every window ends Sun 23 Aug 2026; dayOffset puts the weekend dips on real weekends.
const VIEWS: Record<Preset, View> = {
  "7D": buildView({
    series: { n: 84, perDay: 12, dayOffset: 0 }, // Mon 17 Aug
    seed: 20260823,
    prevSeed: 991177,
    base: 505,
    prevBase: 466,
    growth: 0.1,
    prevGrowth: 0.08,
    buckets: DAY_NAMES,
    stamps: hourStamps(7, 12),
    cadence: "Per hour",
  }),
  "30D": buildView({
    series: { n: 30, perDay: 1, dayOffset: 5 }, // Sat 25 Jul
    seed: 31220260,
    prevSeed: 77410031,
    base: 6360,
    prevBase: 5620,
    growth: 0.3,
    prevGrowth: 0.24,
    buckets: ["Jul 28", "Aug 3", "Aug 9", "Aug 15", "Aug 21"],
    stamps: dayStamps(2026, 6, 25, 30),
    cadence: "Per day",
  }),
  "90D": buildView({
    series: { n: 90, perDay: 1, dayOffset: 1 }, // Tue 26 May
    seed: 90260526,
    prevSeed: 41330077,
    base: 5560,
    prevBase: 4680,
    growth: 0.62,
    prevGrowth: 0.5,
    buckets: ["Jun 2", "Jun 17", "Jul 2", "Jul 17", "Aug 1", "Aug 16"],
    stamps: dayStamps(2026, 4, 26, 90),
    cadence: "Per day",
  }),
};

const RANGES: Record<Preset, { label: string; window: string }> = {
  "7D": { label: "Last 7 days", window: "Aug 17 – Aug 23" },
  "30D": { label: "Last 30 days", window: "Jul 25 – Aug 23" },
  "90D": { label: "Last 90 days", window: "May 26 – Aug 23" },
};

type Focus = { label: string; factor: number; metric: string } | null;

const REALTIME_BARS = [
  0.38, 0.52, 0.44, 0.61, 0.73, 0.58, 0.66, 0.81, 0.7, 0.92, 0.84, 1,
];

const FADE_BOTTOM = `linear-gradient(to bottom, #000 calc(100% - 220px),
  rgb(0 0 0/0.82) calc(100% - 165px), rgb(0 0 0/0.5) calc(100% - 105px),
  rgb(0 0 0/0.18) calc(100% - 45px), transparent)`;

const ICON = { strokeWidth: 1.75, "aria-hidden": true } as const;

export function DashboardMockup() {
  const [preset, setPreset] = useState<Preset>("7D");
  const [focus, setFocus] = useState<Focus>(null);
  const view = VIEWS[preset];

  const choosePreset = (p: Preset) => {
    setPreset(p);
    setFocus(null);
  };
  const toggle = (next: NonNullable<Focus>) =>
    setFocus((f) => (f?.label === next.label ? null : next));

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-1 h-48 rounded-2xl blur-lg"
        style={{ background: HALO }}
      />

      <div
        className="relative rounded-2xl p-px"
        style={{ background: RIM, maskImage: FADE_BOTTOM }}
      >
        <div className="flex flex-col overflow-hidden rounded-[15px] bg-surface-1 pb-6 shadow-edge xl:aspect-16/10">
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
                    unit="Views"
                    rows={view.pages}
                    metric="Pageviews"
                    scale={1}
                    focus={focus}
                    onPick={toggle}
                  />
                  <BarPanel
                    title="Referrers"
                    unit="Sessions"
                    rows={view.referrers}
                    metric="Sessions"
                    scale={1 / PAGES_PER_SESSION}
                    focus={focus}
                    onPick={toggle}
                  />
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

const LIGHTS = ["bg-[#FF5F57]", "bg-[#FEBC2E]", "bg-[#28C840]"];

function SafariChrome() {
  return (
    <div className="flex h-12 shrink-0 items-center gap-4 border-b border-black/40 bg-linear-to-b from-surface-2 to-surface-1 px-4 shadow-edge">
      <div className="flex gap-2">
        {LIGHTS.map((c) => (
          <span
            key={c}
            className={cn(
              "size-3 rounded-full ring-1 ring-black/25 ring-inset",
              c
            )}
          />
        ))}
      </div>

      <div className="hidden items-center gap-3.5 text-ink/45 sm:flex">
        <PanelLeft {...ICON} size={16} />
        <div className="flex items-center gap-2">
          <ChevronLeft {...ICON} size={16} />
          <ChevronRight {...ICON} size={16} className="text-ink/20" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 justify-center">
        <div className="flex h-7 w-full max-w-md items-center gap-2 rounded-lg bg-black/25 px-3 ring-1 ring-ink/6">
          <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
            <Lock {...ICON} size={11} className="shrink-0 text-ink/45" />
            <span className="truncate text-[12px] text-ink/75">
              app.pulseanalytics.io
            </span>
          </span>
          <RotateCw {...ICON} size={12} className="shrink-0 text-ink/35" />
        </div>
      </div>

      <div className="hidden items-center gap-3.5 text-ink/45 sm:flex">
        <Share {...ICON} size={16} />
        <Plus {...ICON} size={16} />
        <Copy {...ICON} size={16} />
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="hidden w-52 shrink-0 flex-col border-r border-ink/8 bg-charcoal md:flex">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-ink/8 px-4">
        <PulseLogo size={22} />
        <span className="truncate font-display text-[14px] font-semibold tracking-display text-ink">
          Pulse
        </span>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2.5 rounded-lg border border-ink/8 bg-ink/3 p-1.5 pr-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-ink/6 text-ink/60">
            <Globe {...ICON} size={14} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium text-ink">
              pulseanalytics.io
            </span>
            <span className="block font-mono text-[10px] text-ink/40">
              Site
            </span>
          </span>
          <ChevronsUpDown {...ICON} size={13} className="text-ink/35" />
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        <NavItem icon={ChartColumn} label="Overview" active />
        <NavItem icon={Code} label="Setup" />
        <NavItem icon={SlidersHorizontal} label="Settings" />
        <span aria-hidden className="mx-2.5 my-2 h-px bg-ink/6" />
        <NavItem icon={LayoutGrid} label="Sites" />
        <NavItem icon={User} label="Account" />
      </nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-ink/8 px-4 py-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-linear-to-b from-tangerine-soft to-tangerine text-[10px] font-semibold text-charcoal">
          AK
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-ink/80">
          akdevv
        </span>
        <LogOut {...ICON} size={14} className="text-ink/35" />
      </div>
    </aside>
  );
}

function NavItem({
  icon: NavIcon,
  label,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[12.5px]",
        active ? "bg-ink/6 text-ink shadow-edge" : "text-ink/55"
      )}
    >
      <NavIcon
        {...ICON}
        size={15}
        className={active ? "text-tangerine" : "text-ink/45"}
      />
      {label}
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
    <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-ink/8 px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="font-display text-[15px] font-semibold tracking-display text-ink">
          Overview
        </span>
        <span className="hidden items-center gap-1.5 rounded-md border border-ink/8 bg-ink/3 px-2 py-1 text-[11.5px] text-ink/55 sm:inline-flex">
          <CalendarDays {...ICON} size={12} className="text-ink/40" />
          {RANGES[preset].window}
        </span>
      </div>

      <div
        className="flex shrink-0 items-center rounded-lg bg-black/25 p-0.75 ring-1 ring-ink/6"
        role="group"
        aria-label="Date range"
      >
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPreset(p)}
            aria-pressed={p === preset}
            className={cn(
              "h-6.5 cursor-pointer rounded-md px-2.5 text-[11.5px] font-medium tabular-nums transition-colors duration-150 ease-out",
              p === preset
                ? "bg-surface-2 text-ink shadow-raised"
                : "text-ink/45 hover:text-ink/85"
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

const METRIC_ICONS: Record<string, LucideIcon> = {
  Pageviews: Eye,
  Sessions: MousePointerClick,
  "Unique visitors": Users,
};

function Metrics({ view, charted }: { view: View; charted: string }) {
  return (
    <div className="grid shrink-0 grid-cols-2 gap-px border-b border-ink/8 bg-ink/8 lg:grid-cols-4">
      {view.metrics.map(({ label, value, delta }) => (
        <Cell
          key={label}
          icon={METRIC_ICONS[label]}
          label={label}
          value={value}
          lit={label === charted}
        >
          <Delta value={delta} />
        </Cell>
      ))}

      <Cell icon={Activity} label="Active now" value="247" live>
        <div className="flex h-full items-end gap-0.75">
          {REALTIME_BARS.map((h, i) => (
            <span
              key={i}
              className="pa-bar-rise w-0.75 rounded-[1px] bg-powder"
              style={{
                height: `${h * 100}%`,
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

function Cell({
  icon: CellIcon,
  label,
  value,
  children,
  lit = false,
  live = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  children: React.ReactNode;
  lit?: boolean;
  live?: boolean;
}) {
  return (
    <div className="bg-surface-1 px-6 py-4">
      <div
        className={cn(
          "flex items-center gap-2 text-[12.5px] whitespace-nowrap",
          lit ? "text-ink/85" : "text-ink/55"
        )}
      >
        <CellIcon
          {...ICON}
          size={14}
          className={
            lit ? "text-tangerine" : live ? "text-powder" : "text-ink/40"
          }
        />
        {label}
      </div>
      <div
        className={cn(
          "mt-3 font-display text-[28px] leading-none font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums",
          live ? "text-powder" : "text-ink"
        )}
      >
        {value}
      </div>
      <div className="mt-2.5 flex h-5 items-center">{children}</div>
    </div>
  );
}

function TrafficChart({
  view,
  range,
  focus,
  onClear,
}: {
  view: View;
  range: string;
  focus: Focus;
  onClear: () => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const factor = focus?.factor ?? 1;
  const metric = focus?.metric ?? "Pageviews";

  const plot = useMemo(() => {
    const values = view.values.map((v) => v * factor);
    const prevValues = view.prevValues.map((v) => v * factor);
    const { yMax, ticks } = niceScale(Math.max(...values, ...prevValues));
    return {
      values,
      prevValues,
      yMax,
      ticks,
      peak: Math.max(...values),
      path: chartPath(values, yMax),
      prevPath: chartPath(prevValues, yMax),
    };
  }, [view, factor]);

  const n = plot.values.length;
  const top = (v: number) => (1 - v / plot.yMax) * 100;
  const at = Math.min(hover ?? view.peak, n - 1);
  const x = (at / (n - 1)) * 100;
  const y = top(plot.values[at]);
  const yPrev = top(plot.prevValues[at]);

  const legend = [
    { label: range, className: "bg-tangerine" },
    { label: "Previous", className: "bg-powder/45" },
  ];

  return (
    <div className="flex min-h-0 min-w-0 flex-col bg-surface-1 px-6 py-5">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[13px] font-medium text-ink">{metric}</span>
            {focus && (
              <button
                type="button"
                onClick={onClear}
                className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-full bg-tangerine/14 px-2 py-0.75 font-mono text-[10px] text-tangerine"
              >
                <span className="min-w-0 truncate">{focus.label}</span>
                <X {...ICON} size={10} className="shrink-0 opacity-70" />
              </button>
            )}
          </div>
          <div className="mt-0.5 text-[12px] text-ink/40">{view.cadence}</div>
        </div>
        <div className="hidden shrink-0 gap-4 pt-0.5 sm:flex">
          {legend.map(({ label, className }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-[11.5px] text-ink/50"
            >
              <span className={cn("h-0.5 w-3.5 rounded-full", className)} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-44 flex-1">
          <div className="relative w-9 shrink-0">
            {plot.ticks.map((t) => (
              <span
                key={t}
                className="absolute right-2.5 -translate-y-1/2 text-[11px] text-ink/35 tabular-nums"
                style={{ top: `${top(t)}%` }}
              >
                {tick(t)}
              </span>
            ))}
          </div>

          <div
            className="relative min-w-0 flex-1 cursor-crosshair touch-pan-y"
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const f = (e.clientX - r.left) / r.width;
              setHover(Math.min(n - 1, Math.max(0, Math.round(f * (n - 1)))));
            }}
            onPointerLeave={() => setHover(null)}
          >
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              preserveAspectRatio="none"
              className="absolute inset-0 size-full"
              role="img"
              aria-label={`${metric}${focus ? ` for ${focus.label}` : ""}, ${range.toLowerCase()}, peaking at ${int(plot.peak)}`}
            >
              <defs>
                <linearGradient id="pa-chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-tangerine)"
                    stopOpacity="0.3"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-tangerine)"
                    stopOpacity="0"
                  />
                </linearGradient>
                <linearGradient id="pa-chart-line" x1="0" y1="0" x2="1" y2="0">
                  <stop
                    offset="0%"
                    stopColor="var(--color-tangerine)"
                    stopOpacity="0.55"
                  />
                  <stop offset="30%" stopColor="var(--color-tangerine)" />
                  <stop offset="100%" stopColor="var(--color-tangerine-soft)" />
                </linearGradient>
              </defs>

              {plot.ticks.map((t) => (
                <line
                  key={t}
                  x1="0"
                  x2={CHART_W}
                  y1={(top(t) / 100) * CHART_H}
                  y2={(top(t) / 100) * CHART_H}
                  stroke="var(--color-ink)"
                  strokeOpacity={t === 0 ? 0.12 : 0.05}
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
                stroke="var(--color-powder)"
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
                  animation:
                    "pa-chart-draw 1.6s var(--ease-out) 0.15s forwards",
                  filter: "drop-shadow(0 0 8px var(--pa-accent-glow))",
                }}
              />
            </svg>

            <div aria-hidden className="pointer-events-none">
              <div
                className="absolute inset-y-0 w-px bg-linear-to-b from-transparent via-ink/22 to-transparent"
                style={{ left: `${x}%` }}
              />
              <span
                className="absolute size-1.5 -translate-1/2 rounded-full bg-powder/55"
                style={{ left: `${x}%`, top: `${yPrev}%` }}
              />
              <span
                className="absolute size-2.5 -translate-1/2 rounded-full border-2 border-surface-1 bg-tangerine shadow-[0_0_0_3px_var(--pa-accent-glow)]"
                style={{ left: `${x}%`, top: `${y}%` }}
              />
              <div
                className={cn(
                  "absolute -translate-y-1/2 rounded-lg border border-ink/12 bg-surface-2 px-2.5 py-1.5 whitespace-nowrap shadow-[0_10px_24px_-10px_rgb(0_0_0/0.9)]",
                  x > 60 ? "-translate-x-[calc(100%+12px)]" : "translate-x-3"
                )}
                style={{
                  left: `${x}%`,
                  top: `${Math.min(Math.max(y, 6), 66)}%`,
                }}
              >
                <div className="text-[11px] text-ink/50">{view.stamps[at]}</div>
                <div className="mt-1 flex items-center gap-3 text-[12px] tabular-nums">
                  <span className="flex items-center gap-1.5 text-ink">
                    <span className="size-1.5 rounded-full bg-tangerine" />
                    {int(plot.values[at])}
                  </span>
                  <span className="flex items-center gap-1.5 text-ink/45">
                    <span className="size-1.5 rounded-full bg-powder/50" />
                    {int(plot.prevValues[at])}
                  </span>
                </div>
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
              <span key={b} className="text-center text-[11px] text-ink/40">
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BarPanel({
  title,
  unit,
  rows,
  metric,
  scale,
  focus,
  onPick,
}: {
  title: string;
  unit: string;
  rows: Row[];
  metric: string;
  scale: number;
  focus: Focus;
  onPick: (f: NonNullable<Focus>) => void;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col bg-surface-1 px-6 py-5">
      <div className="mb-3 flex shrink-0 items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink">{title}</span>
        <span className="text-[11.5px] text-ink/35">{unit}</span>
      </div>
      <div className="flex flex-col gap-1">
        {rows.map(({ label, of, hits, width }, i) => {
          const on = focus?.label === label;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() => onPick({ label, factor: of * scale, metric })}
              className={cn(
                "group relative flex cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-md px-2.5 py-1.5 text-left font-mono text-[11.5px] transition-opacity duration-200 ease-out focus-visible:-outline-offset-2",
                focus && !on && "opacity-45 hover:opacity-100"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "pa-bar absolute inset-y-0 left-0 rounded-md bg-tangerine transition-opacity duration-200 ease-out",
                  on && "ring-1 ring-tangerine/55 ring-inset"
                )}
                style={{
                  width: `${width * 100}%`,
                  opacity: on ? 0.26 : 0.05 + width * 0.07,
                  ["--pa-delay" as string]: `${450 + i * 60}ms`,
                }}
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-md bg-ink/5 opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100"
              />
              <span
                className={cn(
                  "relative min-w-0 truncate",
                  on ? "text-ink" : "text-ink/75"
                )}
              >
                {label}
              </span>
              <span className="relative flex shrink-0 items-center gap-2 tabular-nums">
                <span
                  className={cn(
                    "text-ink/40 transition-opacity duration-150 ease-out",
                    on ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  {(of * 100).toFixed(1)}%
                </span>
                <span className={on ? "text-ink" : "text-ink/55"}>{hits}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  const Arrow = up ? ArrowUp : ArrowDown;
  return (
    <span className="flex items-center gap-2 text-[11.5px]">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums",
          up ? "bg-powder/10 text-powder" : "bg-ink/6 text-ink/55"
        )}
      >
        <Arrow {...ICON} size={11} strokeWidth={2.25} />
        {Math.abs(value).toFixed(1)}%
      </span>
      <span className="text-ink/35">vs previous</span>
    </span>
  );
}
