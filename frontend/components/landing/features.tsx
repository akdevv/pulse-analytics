import { Zap, BarChart2, Globe, Code2, Bell, Lock } from "lucide-react";
import { ACCENT, DISPLAY, SectionEyebrow, SectionHeading } from "./shared";

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

const BG = { background: "oklch(0.14 0.004 285)" };
const INNER = { background: "oklch(0.11 0.003 285)" };

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
      className={`group relative flex flex-col p-8 transition-colors duration-300 hover:bg-white/3 ${className}`}
      style={BG}
    >
      <div
        className="inline-flex items-center justify-center w-9 h-9 mb-6 text-white/70 transition-colors duration-300 group-hover:text-white"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        {ICON[iconKey]}
      </div>
      <h3
        className="text-[18px] text-white mb-2 tracking-tight"
        style={DISPLAY}
      >
        {title}
      </h3>
      <p className="text-[13.5px] text-white/50 leading-relaxed">
        {description}
      </p>
      {children}
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="relative py-40 bg-black overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start gap-6 mb-20 max-w-3xl">
          <SectionEyebrow>Metrics</SectionEyebrow>
          <SectionHeading
            line1="Small system, big numbers,"
            line2="zero pager duty."
          />
        </div>

        <div
          className="grid grid-cols-6 grid-rows-[auto_auto_auto] gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10"
        >
          {/* Row 1 — hero feature (4 cols) + stat cell (2 cols) */}
          <div
            className="col-span-6 lg:col-span-4 row-span-1 relative p-10 lg:p-12 overflow-hidden"
            style={BG}
          >
            <div
              aria-hidden
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20"
              style={{ background: ACCENT }}
            />
            <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-center">
              <div>
                <div
                  className="inline-flex w-9 h-9 items-center justify-center mb-6"
                  style={{
                    background:
                      "color-mix(in oklab, " + ACCENT + " 14%, transparent)",
                    color: ACCENT,
                  }}
                >
                  {ICON.bolt}
                </div>
                <h3
                  className="text-[30px] md:text-[38px] text-white mb-4 tracking-[-0.02em] leading-[1.02]"
                  style={DISPLAY}
                >
                  Ten thousand RPS,
                  <br />
                  <span className="text-white/45">zero drops.</span>
                </h3>
                <p className="text-[14.5px] text-white/55 leading-relaxed max-w-md">
                  Load-tested on a single box. Ingest stays under 5ms p90 while
                  the queue drains in the background.
                </p>
              </div>

              <div
                className="border border-white/10 p-4 min-w-[280px]"
                style={{ ...INNER, borderRadius: 0 }}
              >
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-[10px] font-mono text-white/55 uppercase tracking-[0.2em]">
                    Live feed
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-white/30 tabular-nums">
                    247 on
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {HIGHLIGHT_EVENTS.map((e, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-white/70 w-[80px] truncate">
                        {e.event}
                      </span>
                      <span className="text-[10.5px] text-white/45 font-mono flex-1 truncate">
                        {e.path}
                      </span>
                      <span className="text-[10px] text-emerald-400/70 font-mono tabular-nums">
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
            className="col-span-6 lg:col-span-3 relative p-8 flex flex-col justify-between overflow-hidden"
            style={BG}
          >
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/50 mb-3">
                Stack
              </div>
              <h3
                className="text-[20px] text-white tracking-tight leading-snug"
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
                  className="text-[10.5px] font-mono text-white/65 px-2 py-1 border border-white/10 rounded-md"
                  style={INNER}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
