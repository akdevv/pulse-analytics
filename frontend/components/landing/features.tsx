import { ACCENT, DISPLAY, SectionEyebrow, SectionHeading } from "./shared";

const ICON: Record<string, React.ReactNode> = {
  bolt: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  bars: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18M7 20V10M12 20V4M17 20v-7" />
    </svg>
  ),
  globe: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  ),
  code: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4 4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  bell: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.16V11a6 6 0 0 0-4-5.66V5a2 2 0 1 0-4 0v.34C7.67 6.17 6 8.39 6 11v3.16c0 .54-.21 1.06-.6 1.44L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
    </svg>
  ),
  lock: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 1 1 8 0v4M6 11h12v10H6z" />
    </svg>
  ),
};

const FEATURES: { key: keyof typeof ICON; title: string; description: string }[] = [
  { key: "bolt", title: "Fire-and-forget ingest", description: "204 No Content in under 5ms. The queue does the heavy lifting after the client is gone." },
  { key: "bars", title: "Continuous aggregates", description: "TimescaleDB pre-buckets 1m, 1h, 1d rollups. Dashboards query summaries, not events." },
  { key: "globe", title: "Per-endpoint rate limits", description: "Redis token buckets keyed by route and key. Rude clients bounce, everyone else flies." },
  { key: "code", title: "Schemaless events", description: "Any JSON payload, typed at the query layer. Move fast, break only yourself." },
  { key: "bell", title: "Backpressure, not data loss", description: "RabbitMQ absorbs spikes. Workers catch up. The ingest never apologizes." },
  { key: "lock", title: "Cookieless by default", description: "Tracking IDs live in Redis. No device fingerprinting, no creepy third-party nonsense." },
];

const HIGHLIGHT_EVENTS = [
  { event: "page_view", path: "/stack", ms: 3 },
  { event: "button_click", path: "/", ms: 4 },
  { event: "form_submit", path: "/hire-me", ms: 2 },
  { event: "page_view", path: "/architecture", ms: 5 },
  { event: "scroll_depth", path: "/story", ms: 4 },
];

export function Features() {
  return (
    <section id="features" className="relative py-40 bg-black overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start gap-6 mb-24 max-w-3xl">
          <SectionEyebrow>Metrics</SectionEyebrow>
          <SectionHeading
            line1="Small system, big numbers,"
            line2="zero pager duty."
          />
        </div>

        <div
          className="relative overflow-hidden rounded-2xl border border-white/6 p-10 md:p-14 mb-4"
          style={{ background: "oklch(0.14 0.004 285)" }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
            <div>
              <div
                className="inline-flex w-9 h-9 items-center justify-center rounded-lg mb-6"
                style={{
                  background: "color-mix(in oklab, " + ACCENT + " 14%, transparent)",
                  color: ACCENT,
                }}
              >
                {ICON.bolt}
              </div>
              <h3
                className="text-[34px] md:text-[44px] text-white mb-5 tracking-[-0.02em] leading-[1.02]"
                style={DISPLAY}
              >
                Ten thousand RPS,
                <br />
                <span className="text-white/45">zero drops.</span>
              </h3>
              <p className="text-[15px] text-white/55 leading-relaxed mb-10 max-w-md">
                Load-tested on a single box. Ingest stays under 5ms p90 while
                the queue drains in the background. Add workers horizontally
                if you feel fancy.
              </p>
              <div className="grid grid-cols-2 gap-y-6 gap-x-10">
                {[
                  { label: "Ingest p90", value: "< 5ms" },
                  { label: "Throughput", value: "10k RPS" },
                  { label: "Data loss", value: "0.00%" },
                  { label: "Infra cost", value: "< $40/mo" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div
                      className="text-[22px] font-medium text-white tabular-nums"
                      style={DISPLAY}
                    >
                      {value}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/35 mt-1">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-xl border border-white/6 p-5"
              style={{ background: "oklch(0.11 0.003 285)" }}
            >
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/6">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-[0.2em]">
                  Live feed
                </span>
                <span className="ml-auto text-[10px] font-mono text-white/30 tabular-nums">
                  247 online
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {HIGHLIGHT_EVENTS.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3"
                  >
                    <span className="text-[10px] font-mono text-white/70 w-[88px] truncate">
                      {e.event}
                    </span>
                    <span className="text-[11px] text-white/45 font-mono flex-1 truncate">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/6 bg-white/6">
          {FEATURES.map(({ key, title, description }) => (
            <div
              key={title}
              className="group relative p-8 transition-colors duration-300 hover:bg-white/3"
              style={{ background: "oklch(0.14 0.004 285)" }}
            >
              <div
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg mb-6 text-white/65 transition-colors duration-300 group-hover:text-white"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                {ICON[key]}
              </div>
              <h3
                className="text-[17px] font-medium text-white mb-2 tracking-tight"
                style={DISPLAY}
              >
                {title}
              </h3>
              <p className="text-[13.5px] text-white/50 leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
