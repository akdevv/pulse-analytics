import Link from "next/link";
import { ACCENT, AnimatedCounter, DISPLAY } from "./shared";
import { DashboardMockup } from "./dashboard-mockup";

const STATS = [
  { value: 1, suffix: "M+", label: "Users, allegedly" },
  { value: 10, suffix: "k RPS", label: "Before it sweats" },
  { value: 5, suffix: "ms p90", label: "Ingestion latency" },
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-black pt-36 pb-16">
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: "url('/hero-bg.jpeg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% 30%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.88) 60%, rgba(0,0,0,0.98) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse 70% 50% at 50% 40%, black 30%, transparent 80%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <Link
          href="/changelog"
          className="group inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/2 px-3 py-1 text-[12px] text-white/65 transition-colors hover:border-white/20 hover:text-white mb-10"
        >
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-black"
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
            className="text-white/40 transition-transform duration-300 group-hover:translate-x-0.5"
          >
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <h1
          className="text-[64px] sm:text-[84px] md:text-[104px] text-white leading-[0.95] tracking-[-0.025em] mb-8"
          style={DISPLAY}
        >
          Event analytics,
          <br />
          <span className="text-white/45">at ridiculous scale.</span>
        </h1>

        <p className="text-[17px] text-white/55 mb-12 max-w-xl mx-auto leading-relaxed">
          A weekend that turned into a project. Node, Redis, RabbitMQ,
          TimescaleDB — ten thousand events a second at sub-five ms. No
          roadmap. No investors. Just vibes and hyper-tables.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-20">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium text-black text-[14px] transition-colors hover:brightness-110"
            style={{ background: ACCENT }}
          >
            Try the demo
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] text-white/75 border border-white/10 transition-colors hover:text-white hover:border-white/20"
          >
            Read the source
          </a>
        </div>

        <div className="flex items-center justify-center gap-10 sm:gap-16 max-w-xl mx-auto">
          {STATS.map(({ value, suffix, label }) => (
            <div key={label} className="text-center">
              <div
                className="text-[22px] font-medium text-white/90"
                style={DISPLAY}
              >
                <AnimatedCounter end={value} suffix={suffix} />
              </div>
              <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.18em] text-white/35">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-24 w-full max-w-6xl mx-auto px-6">
        <DashboardMockup />
      </div>
    </section>
  );
}
