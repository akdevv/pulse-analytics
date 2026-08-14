import { Zap, BarChart2, Globe, Code2, Bell, Lock } from "lucide-react";
import {
  ACCENT,
  DISPLAY,
  Reveal,
  SectionEyebrow,
  SectionHeading,
} from "./shared";

const ICON = {
  bolt: <Zap size={18} />,
  bars: <BarChart2 size={18} />,
  globe: <Globe size={18} />,
  code: <Code2 size={18} />,
  bell: <Bell size={18} />,
  lock: <Lock size={18} />,
} as const;

const HIGHLIGHT_EVENTS = [
  { event: "page_view", path: "/stack", ms: 3 },
  { event: "button_click", path: "/", ms: 4 },
  { event: "form_submit", path: "/hire-me", ms: 2 },
  { event: "page_view", path: "/architecture", ms: 5 },
  { event: "scroll_depth", path: "/story", ms: 4 },
];

const BG = { background: "oklch(0.165 0.004 285)" };
const INNER = { background: "oklch(0.13 0.003 285)" };

function FeatureCell({
  iconKey,
  title,
  description,
  className = "",
  children,
}: {
  iconKey: keyof typeof ICON;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden p-8 transition-colors duration-200 ease-out ${className}`}
      style={BG}
    >
      {/* hover accent hairline */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
        }}
      />
      {/* hover corner glow */}
      <div
        aria-hidden
        className="absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-20"
        style={{ background: ACCENT }}
      />

      <div
        className="relative mb-6 inline-flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-200 ease-out group-hover:scale-105"
        style={{
          background: "color-mix(in oklab, " + ACCENT + " 13%, transparent)",
          color: ACCENT,
          border:
            "1px solid color-mix(in oklab, " + ACCENT + " 22%, transparent)",
        }}
      >
        {ICON[iconKey]}
      </div>
      <h3
        className="relative mb-2 text-[18px] tracking-tight text-white"
        style={DISPLAY}
      >
        {title}
      </h3>
      <p className="relative text-[13.5px] leading-relaxed text-white/50">
        {description}
      </p>
      {children}
    </div>
  );
}

export function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden py-40"
      style={{ background: "var(--pa-bg)" }}
    >
      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal className="mb-20 flex max-w-3xl flex-col items-start gap-6">
          <SectionEyebrow>Metrics</SectionEyebrow>
          <SectionHeading
            line1="Small system, big numbers,"
            line2="zero pager duty."
          />
        </Reveal>

        <Reveal
          delay={80}
          className="grid grid-cols-6 grid-rows-[auto_auto_auto] gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10"
        >
          {/* Row 1 — hero feature (4 cols) + stat cell (2 cols) */}
          <div
            className="relative col-span-6 row-span-1 overflow-hidden p-10 lg:col-span-4 lg:p-12"
            style={BG}
          >
            <div
              aria-hidden
              className="absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
              style={{ background: ACCENT }}
            />
            <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_auto]">
              <div>
                <div
                  className="mb-6 inline-flex h-9 w-9 items-center justify-center"
                  style={{
                    background:
                      "color-mix(in oklab, " + ACCENT + " 14%, transparent)",
                    color: ACCENT,
                  }}
                >
                  {ICON.bolt}
                </div>
                <h3
                  className="mb-4 text-[30px] leading-[1.02] tracking-[-0.02em] text-white md:text-[38px]"
                  style={DISPLAY}
                >
                  Ten thousand RPS,
                  <br />
                  <span className="text-white/45">zero drops.</span>
                </h3>
                <p className="max-w-md text-[14.5px] leading-relaxed text-white/55">
                  Load-tested on a single box. Ingest stays under 5ms p90 while
                  the queue drains in the background.
                </p>
              </div>

              <div
                className="min-w-[280px] border border-white/10 p-4"
                style={{ ...INNER, borderRadius: 0 }}
              >
                <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.2em] text-white/55 uppercase">
                    Live feed
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-white/30 tabular-nums">
                    247 on
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {HIGHLIGHT_EVENTS.map((e, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-[80px] truncate font-mono text-[10px] text-white/70">
                        {e.event}
                      </span>
                      <span className="flex-1 truncate font-mono text-[10.5px] text-white/45">
                        {e.path}
                      </span>
                      <span className="font-mono text-[10px] text-emerald-400/70 tabular-nums">
                        {e.ms}ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <FeatureCell
            iconKey="bars"
            title="Continuous aggregates"
            description="TimescaleDB pre-buckets 1m, 1h, 1d rollups. Dashboards query summaries, not events."
            className="col-span-6 lg:col-span-2"
          />

          {/* Row 2 — three equal cols */}
          <FeatureCell
            iconKey="globe"
            title="Per-endpoint rate limits"
            description="Redis token buckets keyed by route and key. Rude clients bounce, everyone else flies."
            className="col-span-6 md:col-span-3 lg:col-span-2"
          />
          <FeatureCell
            iconKey="code"
            title="Schemaless events"
            description="Any JSON payload, typed at the query layer. Move fast, break only yourself."
            className="col-span-6 md:col-span-3 lg:col-span-2"
          />
          <FeatureCell
            iconKey="bell"
            title="Backpressure, not loss"
            description="RabbitMQ absorbs spikes. Workers catch up. The ingest never apologizes."
            className="col-span-6 md:col-span-6 lg:col-span-2"
          />

          {/* Row 3 — wide privacy + mini architecture teaser */}
          <FeatureCell
            iconKey="lock"
            title="Cookieless by default"
            description="Tracking IDs live in Redis. No device fingerprinting, no creepy third-party nonsense. Analytics that don't make your DPO cry."
            className="col-span-6 lg:col-span-3"
          />
          <div
            className="relative col-span-6 flex flex-col justify-between overflow-hidden p-8 lg:col-span-3"
            style={BG}
          >
            <div>
              <div className="mb-3 font-mono text-[11px] tracking-[0.22em] text-white/50 uppercase">
                Stack
              </div>
              <h3
                className="text-[20px] leading-snug tracking-tight text-white"
                style={DISPLAY}
              >
                Node, Redis, RabbitMQ,
                <br />
                TimescaleDB. On Docker, on AWS.
              </h3>
            </div>
            <div className="mt-8 flex flex-wrap gap-1.5">
              {[
                "Node.js",
                "TypeScript",
                "Express",
                "Redis",
                "RabbitMQ",
                "TimescaleDB",
                "Docker",
                "AWS",
              ].map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10.5px] text-white/65"
                  style={INNER}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
