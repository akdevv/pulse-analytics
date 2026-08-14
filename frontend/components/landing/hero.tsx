import Link from "next/link";
import {
  ACCENT,
  ACCENT_SOFT,
  AnimatedCounter,
  DISPLAY,
  GhostButton,
  PrimaryButton,
  Reveal,
} from "./shared";
import { DashboardMockup } from "./dashboard-mockup";

const STATS = [
  { value: 1, suffix: "M+", label: "Users, allegedly" },
  { value: 10, suffix: "k RPS", label: "Before it sweats" },
  { value: 5, suffix: "ms p90", label: "Ingestion latency" },
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-40 pb-16">
      {/* base wash */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "var(--pa-bg)" }}
      />

      {/* aurora mesh — drifting amber light */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div
          className="pa-aurora absolute top-[-10%] left-1/2 h-[620px] w-[820px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{
            background: `radial-gradient(circle at center, ${ACCENT} 0%, transparent 62%)`,
            opacity: 0.22,
          }}
        />
        <div
          className="pa-aurora-slow absolute top-[6%] right-[8%] h-[420px] w-[420px] rounded-full blur-[120px]"
          style={{
            background: `radial-gradient(circle at center, ${ACCENT_SOFT} 0%, transparent 60%)`,
            opacity: 0.14,
          }}
        />
        <div
          className="pa-aurora absolute top-[24%] left-[4%] h-[360px] w-[360px] rounded-full blur-[120px]"
          style={{
            background:
              "radial-gradient(circle at center, oklch(0.6 0.13 250) 0%, transparent 60%)",
            opacity: 0.1,
          }}
        />
      </div>

      {/* fine grid with radial mask */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 70% 55% at 50% 38%, black 25%, transparent 78%)",
        }}
      />

      {/* vignette to settle the base into black footer/sections */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 70% at 50% 20%, transparent 40%, var(--pa-bg) 88%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <Link
            href="/changelog"
            className="group mb-10 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[12px] text-white/65 backdrop-blur-sm transition-colors duration-150 ease-[var(--ease-out)] hover:border-white/20 hover:text-white"
          >
            <span
              className="rounded-full px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-black uppercase"
              style={{ background: ACCENT }}
            >
              v0.1
            </span>
            Open-source pet project · not a real product
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-white/40 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5"
            >
              <path
                d="M9 6l6 6-6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </Reveal>

        <Reveal delay={60}>
          <h1
            className="mb-8 text-[64px] leading-[0.92] tracking-[-0.03em] text-white sm:text-[84px] md:text-[108px]"
            style={DISPLAY}
          >
            Event analytics,
            <br />
            <span style={{ color: ACCENT_SOFT }}>at ridiculous scale.</span>
          </h1>
        </Reveal>

        <Reveal delay={120}>
          <p className="mx-auto mb-12 max-w-xl text-[17px] leading-relaxed text-white/55">
            A weekend that turned into a project. Node, Redis, RabbitMQ,
            TimescaleDB — ten thousand events a second at sub-five ms. No
            roadmap. No investors. Just vibes and hyper-tables.
          </p>
        </Reveal>

        <Reveal delay={180}>
          <div className="mb-20 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
            <PrimaryButton href="/signup" className="px-6 py-3">
              Try the demo
            </PrimaryButton>
            <GhostButton href="#how-it-works">Read the source</GhostButton>
          </div>
        </Reveal>

        <Reveal delay={240}>
          <div className="mx-auto flex max-w-xl items-center justify-center gap-10 sm:gap-16">
            {STATS.map(({ value, suffix, label }) => (
              <div key={label} className="text-center">
                <div
                  className="text-[24px] font-medium text-white/90"
                  style={DISPLAY}
                >
                  <AnimatedCounter end={value} suffix={suffix} />
                </div>
                <div className="mt-1 font-mono text-[10px] tracking-[0.18em] text-white/35 uppercase">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* signature pulse line — the brand EKG, drawn across */}
      <div className="relative z-10 mx-auto mt-20 max-w-6xl px-6">
        <PulseLine />
      </div>

      <Reveal
        delay={120}
        className="relative z-10 mx-auto mt-10 w-full max-w-6xl px-6"
      >
        <DashboardMockup />
      </Reveal>
    </section>
  );
}

function PulseLine() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 60"
      preserveAspectRatio="none"
      className="h-[60px] w-full"
    >
      <defs>
        <linearGradient id="pulseFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0" />
          <stop offset="18%" stopColor={ACCENT} stopOpacity="0.5" />
          <stop offset="50%" stopColor={ACCENT_SOFT} stopOpacity="0.9" />
          <stop offset="82%" stopColor={ACCENT} stopOpacity="0.5" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* baseline */}
      <line
        x1="0"
        y1="30"
        x2="1200"
        y2="30"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
      />
      {/* EKG trace */}
      <path
        className="pa-pulse-path"
        style={{ ["--pa-len" as string]: "2400" }}
        d="M0,30 H460 l14,-2 14,4 16,-22 18,40 16,-44 16,28 14,-4 14,0 H700 l40,-1 30,2 H1200"
        fill="none"
        stroke="url(#pulseFade)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="drop-shadow(0 0 6px var(--pa-accent-glow))"
      />
    </svg>
  );
}
