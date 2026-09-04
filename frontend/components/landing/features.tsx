import { Zap, BarChart2, Globe, Code2, Bell, Lock } from "lucide-react";
import { ACCENT, DISPLAY, POWDER } from "./tokens";
import { Reveal, SectionHeading } from "./shared";

const ICON = {
  bolt: <Zap size={17} />,
  bars: <BarChart2 size={17} />,
  globe: <Globe size={17} />,
  code: <Code2 size={17} />,
  bell: <Bell size={17} />,
  lock: <Lock size={17} />,
} as const;

const HIGHLIGHT_EVENTS = [
  { event: "page_view", path: "/stack", ms: 3 },
  { event: "button_click", path: "/", ms: 4 },
  { event: "form_submit", path: "/hire-me", ms: 2 },
  { event: "page_view", path: "/architecture", ms: 5 },
  { event: "scroll_depth", path: "/story", ms: 4 },
];

const SURFACE = { background: "oklch(0.2350 0 0)" };
const INSET = { background: "oklch(0.1750 0 0)" };

/* ── Cells ─────────────────────────────────────────────────────
   Six claims used to be six identical icon-and-paragraph cards, which
   is the laziest container a grid can hold. Each one now closes on a
   line of evidence: the header it sets, the payload it accepts, the
   depth it drains. The claim and its proof read together. */
function FeatureCell({
  iconKey,
  title,
  description,
  evidence,
  className = "",
}: {
  iconKey: keyof typeof ICON;
  title: string;
  description: string;
  evidence: { k: string; v: string };
  className?: string;
}) {
  return (
    <div
      className={`group relative flex flex-col p-8 ${className}`}
      style={SURFACE}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
        }}
      />

      <div className="mb-5 text-ink/35 transition-colors duration-200 ease-out group-hover:text-ink/60">
        {ICON[iconKey]}
      </div>

      <h3 className="mb-2 text-[18px] tracking-tight text-ink" style={DISPLAY}>
        {title}
      </h3>
      <p className="mb-6 text-[13px] leading-relaxed text-ink/55">
        {description}
      </p>

      <div className="mt-auto flex items-baseline gap-2 border-t border-ink/8 pt-4 font-mono text-[11px]">
        <span className="shrink-0 text-ink/40">{evidence.k}</span>
        <span className="min-w-0 truncate" style={{ color: POWDER }}>
          {evidence.v}
        </span>
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-charcoal py-28 md:py-40"
    >
      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal className="mb-20 max-w-3xl">
          <SectionHeading
            line1="Small system, big numbers,"
            line2="zero pager duty."
          />
        </Reveal>

        <Reveal
          delay={80}
          className="grid grid-cols-6 gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10"
        >
          {/* Row 1 — the headline claim, with the feed as its proof */}
          <div
            className="relative col-span-6 overflow-hidden p-10 lg:col-span-4 lg:p-12"
            style={SURFACE}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-[0.13] blur-3xl"
              style={{ background: ACCENT }}
            />
            <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="mb-5" style={{ color: ACCENT }}>
                  {ICON.bolt}
                </div>
                <h3
                  className="mb-4 text-[30px] leading-[1.02] tracking-[-0.02em] text-ink md:text-[38px]"
                  style={DISPLAY}
                >
                  Ten thousand RPS,
                  <br />
                  <span className="text-ink/45">zero drops.</span>
                </h3>
                <p className="max-w-md text-[14px] leading-relaxed text-ink/55">
                  Load-tested on a single box. Ingest stays under 5ms p90 while
                  the queue drains in the background.
                </p>
              </div>

              <div
                className="min-w-[280px] rounded-xl border border-ink/10 p-4"
                style={INSET}
              >
                <div className="mb-3 flex items-center gap-2 border-b border-ink/10 pb-3">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-powder opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-powder" />
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.18em] text-ink/50 uppercase">
                    Live feed
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-ink/45 tabular-nums">
                    247 on
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {HIGHLIGHT_EVENTS.map((e, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-[80px] truncate font-mono text-[10px] text-ink/70">
                        {e.event}
                      </span>
                      <span className="flex-1 truncate font-mono text-[10px] text-ink/50">
                        {e.path}
                      </span>
                      <span
                        className="font-mono text-[10px] tabular-nums"
                        style={{ color: POWDER, opacity: 0.7 }}
                      >
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
            description="TimescaleDB pre-buckets the rollups. Dashboards query summaries, never raw events."
            evidence={{ k: "time_bucket()", v: "1m · 1h · 1d" }}
            className="col-span-6 lg:col-span-2"
          />

          {/* Row 2 — three equal columns */}
          <FeatureCell
            iconKey="globe"
            title="Per-endpoint rate limits"
            description="Redis token buckets keyed by route and key. Rude clients bounce, everyone else flies."
            evidence={{ k: "x-ratelimit-remaining", v: "87 / 100" }}
            className="col-span-6 md:col-span-3 lg:col-span-2"
          />
          <FeatureCell
            iconKey="code"
            title="Schemaless events"
            description="Any JSON payload, typed at the query layer. Move fast, break only yourself."
            evidence={{ k: "props", v: '{ "cart_value": 42.1 }' }}
            className="col-span-6 md:col-span-3 lg:col-span-2"
          />
          <FeatureCell
            iconKey="bell"
            title="Backpressure, not loss"
            description="RabbitMQ absorbs the spike, workers catch up. The ingest never apologizes."
            evidence={{ k: "queue depth", v: "12,480 → 0 in 4s" }}
            className="col-span-6 md:col-span-6 lg:col-span-2"
          />

          {/* Row 3 — privacy, then the stack it all runs on */}
          <FeatureCell
            iconKey="lock"
            title="Cookieless by default"
            description="Tracking IDs live in Redis. No device fingerprinting, no third-party pixels, nothing for your DPO to cry about."
            evidence={{ k: "document.cookie", v: '""' }}
            className="col-span-6 lg:col-span-3"
          />
          <div
            className="relative col-span-6 flex flex-col justify-between p-8 lg:col-span-3"
            style={SURFACE}
          >
            <h3
              className="text-[20px] leading-snug tracking-tight text-ink"
              style={DISPLAY}
            >
              Node, Redis, RabbitMQ,
              <br />
              TimescaleDB. On Docker, on AWS.
            </h3>
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
                  className="rounded-md border border-ink/10 px-2 py-1 font-mono text-[11px] text-ink/60"
                  style={INSET}
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
