import Link from "next/link";
import { ACCENT, DISPLAY } from "./shared";

export function CTA() {
  return (
    <section
      id="pricing"
      className="relative py-40 bg-black overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 100%, oklch(0.6429 0.1675 45.988 / 0.14) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2
          className="text-[56px] md:text-[88px] text-white mb-8 leading-none tracking-[-0.025em]"
          style={DISPLAY}
        >
          Find this impressive?
          <br />
          <span className="text-white/40">Hire me. Or don’t.</span>
        </h2>

        <p className="text-[15px] md:text-[17px] text-white/55 mb-12 max-w-md mx-auto">
          Available for staff / senior backend and platform roles. I like
          queues, databases, and writing code that stays up at 3 AM.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-medium text-black text-[14px] transition-colors hover:brightness-110"
            style={{ background: ACCENT }}
          >
            Get in touch
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
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[14px] text-white/75 border border-white/10 transition-colors hover:text-white hover:border-white/20"
          >
            Star on GitHub
          </Link>
        </div>

        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/30 mt-8">
          MIT licensed · built with ink and grit
        </p>
      </div>
    </section>
  );
}
