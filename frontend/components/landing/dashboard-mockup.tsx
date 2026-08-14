import { ACCENT, ACCENT_SOFT, SURFACE_1 } from "./shared";

const METRICS = [
  { label: "Visitors", value: "12,847", delta: "+14.2%" },
  { label: "Page views", value: "48,291", delta: "+8.7%" },
  { label: "Bounce rate", value: "34.2%", delta: "-3.1%" },
  { label: "Avg session", value: "4m 12s", delta: "+0.8%" },
];

const NAV = ["Overview", "Events", "Users", "Sources", "Settings"];

const LIVE = [
  { path: "/pricing", loc: "San Francisco", time: "just now" },
  { path: "/features", loc: "London", time: "2s ago" },
  { path: "/docs/api", loc: "Tokyo", time: "5s ago" },
];

const CHART_D =
  "M0,80 C30,72 50,90 80,65 C110,42 130,60 160,40 C190,18 210,50 240,32 C270,16 290,42 320,26 C350,12 370,32 400,18";

export function DashboardMockup() {
  return (
    <div className="group/mock relative">
      {/* soft floor glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 top-1/3 -bottom-10 opacity-30 blur-[100px]"
        style={{
          background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${ACCENT} 0%, transparent 70%)`,
        }}
      />

      <div
        className="relative overflow-hidden rounded-2xl border border-white/10"
        style={{
          background: SURFACE_1,
          boxShadow:
            "0 1px 0 0 rgba(255,255,255,0.05) inset, 0 0 0 1px rgba(255,255,255,0.02), 0 60px 120px -30px rgba(0,0,0,0.85)",
        }}
      >
        {/* top accent hairline */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent 8%, ${ACCENT} 50%, transparent 92%)`,
            opacity: 0.45,
          }}
        />

        {/* browser chrome */}
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </div>
          <div className="mx-3 flex-1">
            <div className="flex h-6 items-center justify-center gap-1.5 rounded-md border border-white/5 bg-white/[0.03]">
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-emerald-400/70"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="font-mono text-[11px] text-white/35">
                app.pulseanalytics.io/dashboard
              </span>
            </div>
          </div>
        </div>

        <div className="grid min-h-[440px] grid-cols-12 gap-5 p-6">
          {/* sidebar */}
          <div className="col-span-2 flex flex-col gap-0.5">
            {NAV.map((label, i) => (
              <div
                key={label}
                className={`relative rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  i === 0 ? "bg-white/[0.06] text-white" : "text-white/35"
                }`}
              >
                {i === 0 && (
                  <span
                    className="absolute top-1/2 left-0 h-3.5 w-0.5 -translate-y-1/2 rounded-full"
                    style={{ background: ACCENT }}
                  />
                )}
                {label}
              </div>
            ))}
          </div>

          {/* main */}
          <div className="col-span-10 flex flex-col gap-5">
            <div className="grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-white/8 bg-white/[0.06]">
              {METRICS.map(({ label, value, delta }) => {
                const up = !delta.startsWith("-");
                return (
                  <div
                    key={label}
                    className="p-4"
                    style={{ background: SURFACE_1 }}
                  >
                    <div className="mb-2 font-mono text-[10px] tracking-[0.15em] text-white/40 uppercase">
                      {label}
                    </div>
                    <div className="text-[17px] font-semibold text-white tabular-nums">
                      {value}
                    </div>
                    <div
                      className={`mt-1 inline-flex items-center gap-1 font-mono text-[10px] tabular-nums ${
                        up ? "text-emerald-400/85" : "text-rose-400/75"
                      }`}
                    >
                      <span>{up ? "▲" : "▼"}</span>
                      {delta.replace(/[+-]/, "")}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex-1 rounded-xl border border-white/8 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[11px] tracking-[0.15em] text-white/40 uppercase">
                    Visitors
                  </div>
                  <div className="mt-0.5 text-sm text-white/85">
                    Last 7 days
                  </div>
                </div>
                <div className="flex gap-1">
                  {["7d", "30d", "90d"].map((t, i) => (
                    <div
                      key={t}
                      className={`rounded px-2 py-1 font-mono text-[10px] ${
                        i === 0
                          ? "bg-white/[0.07] text-white/85"
                          : "text-white/35"
                      }`}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>

              <svg
                viewBox="0 0 400 120"
                className="w-full"
                preserveAspectRatio="none"
                style={{ height: "140px" }}
              >
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={ACCENT} />
                    <stop offset="100%" stopColor={ACCENT_SOFT} />
                  </linearGradient>
                </defs>
                {[30, 60, 90].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="400"
                    y2={y}
                    stroke="rgba(255,255,255,0.04)"
                  />
                ))}
                <path
                  d={`${CHART_D} L400,120 L0,120 Z`}
                  fill="url(#chartGrad)"
                />
                <path
                  d={CHART_D}
                  fill="none"
                  stroke="url(#chartLine)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: 600,
                    strokeDashoffset: 600,
                    animation:
                      "pa-chart-draw 1.8s var(--ease-out) 0.3s forwards",
                    filter: "drop-shadow(0 0 6px var(--pa-accent-glow))",
                  }}
                />
                <circle cx="400" cy="18" r="4" fill={ACCENT} opacity="0.25" />
                <circle
                  cx="400"
                  cy="18"
                  r="2.2"
                  fill={ACCENT}
                  className="pa-breathe"
                />
              </svg>
            </div>

            <div className="rounded-xl border border-white/8 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="font-mono text-[10px] tracking-[0.18em] text-white/50 uppercase">
                  Live · 247 online
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {LIVE.map(({ path, loc, time }) => (
                  <div
                    key={path}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="font-mono text-white/70">{path}</span>
                    <span className="text-white/40">{loc}</span>
                    <span className="font-mono text-white/30 tabular-nums">
                      {time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
