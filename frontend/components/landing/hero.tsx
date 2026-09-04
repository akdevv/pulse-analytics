import Link from "next/link";
import { ACCENT, ACCENT_SOFT, DISPLAY } from "./tokens";
import { GhostButton, PrimaryButton, Reveal } from "./shared";
import { DashboardMockup } from "./dashboard-mockup";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-32 pb-6 md:pt-40">
      <div aria-hidden className="absolute inset-0 bg-charcoal" />

      {/* One spotlight from above, not a field of blobs — the panel below
          is lit by it, so the light has a source and a subject. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div
          className="pa-aurora absolute top-[-22%] left-1/2 h-[760px] w-[1100px] -translate-x-1/2 blur-[130px]"
          style={{
            background: `radial-gradient(ellipse 44% 58% at 50% 0%, ${ACCENT} 0%, transparent 68%)`,
            opacity: 0.26,
          }}
        />
        <div
          className="pa-aurora-slow absolute top-[42%] left-1/2 h-[420px] w-[900px] -translate-x-1/2 blur-[140px]"
          style={{
            background:
              "radial-gradient(ellipse 50% 60% at 50% 50%, oklch(0.70 0.06 205) 0%, transparent 65%)",
            opacity: 0.09,
          }}
        />
      </div>

      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(229,227,210,1) 1px, transparent 1px), linear-gradient(90deg, rgba(229,227,210,1) 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 70% 55% at 50% 30%, black 20%, transparent 76%)",
        }}
      />

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 70% at 50% 14%, transparent 42%, var(--pa-bg) 90%)",
        }}
      />

      {/* ── The claim ── */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <Link
            href="/changelog"
            className="group mb-9 inline-flex items-center gap-2.5 rounded-full border border-ink/10 bg-ink/[0.03] px-3 py-1 text-[12px] text-ink/70 backdrop-blur-sm transition-colors duration-150 ease-[var(--ease-out)] hover:border-ink/25 hover:text-ink"
          >
            <span
              className="rounded-full px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-charcoal uppercase"
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
              className="text-ink/55 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5"
              aria-hidden
            >
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </Reveal>

        <Reveal delay={60}>
          <h1
            className="text-[46px] leading-[0.93] tracking-[-0.038em] text-balance text-ink sm:text-[64px] md:text-[80px]"
            style={{ ...DISPLAY, fontWeight: 600 }}
          >
            Event analytics, at{" "}
            <span style={{ color: ACCENT_SOFT }}>ridiculous scale.</span>
          </h1>
        </Reveal>

        <Reveal delay={120}>
          <p className="mx-auto mt-7 max-w-lg text-[16.5px] leading-relaxed text-ink/70">
            A weekend that turned into a project. Node, Redis, RabbitMQ,
            TimescaleDB — ten thousand events a second at sub-five ms. No
            roadmap. No investors. Just vibes and hyper-tables.
          </p>
        </Reveal>

        <Reveal delay={180}>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
            <PrimaryButton href="/signup" className="justify-center px-6 py-3">
              Try the demo
            </PrimaryButton>
            <GhostButton href="#how-it-works" className="justify-center">
              See how it works
            </GhostButton>
          </div>
        </Reveal>
      </div>

      {/* ── The evidence, laid back under the light ── */}
      <div className="relative z-10 mx-auto mt-20 max-w-7xl px-6">
        <Reveal delay={240}>
          <DashboardMockup />
        </Reveal>
      </div>

      {/* The EKG closes the section — the last beat of the load sequence,
          picked up straight out of the panel's dissolving bottom edge. */}
      <div className="relative z-10 mx-auto -mt-4 max-w-7xl px-6">
        <PulseLine />
      </div>
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
      <line
        x1="0"
        y1="30"
        x2="1200"
        y2="30"
        stroke="rgba(229,227,210,0.06)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="pa-pulse-path"
        style={{ ["--pa-len" as string]: "2400" }}
        d="M0,30 H460 l14,-2 14,4 16,-22 18,40 16,-44 16,28 14,-4 14,0 H700 l40,-1 30,2 H1200"
        fill="none"
        stroke="url(#pulseFade)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        filter="drop-shadow(0 0 6px var(--pa-accent-glow))"
      />
    </svg>
  );
}
