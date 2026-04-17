import Link from "next/link";
import { Fragment } from "react";
import { ACCENT, DISPLAY } from "./shared";

export function CTA() {
  return (
    <section id="pricing" className="relative py-24 bg-black overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-6">
        {/* main card */}
        <div
          className="relative overflow-hidden rounded-3xl border border-white/8 px-12 py-24 text-center"
          style={{
            background:
              "linear-gradient(160deg, oklch(0.17 0.005 285) 0%, oklch(0.12 0.003 285) 60%, oklch(0.10 0.002 285) 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(255,255,255,0.02)",
          }}
        >
          {/* top accent line */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent 5%, ${ACCENT} 50%, transparent 95%)`,
              opacity: 0.5,
            }}
          />

          {/* ambient glow */}
          <div
            aria-hidden
            className="absolute left-1/2 top-0 -translate-x-1/2 w-[700px] h-[400px] -translate-y-1/2 blur-[100px] pointer-events-none"
            style={{ background: ACCENT, opacity: 0.07 }}
          />
          <div
            aria-hidden
            className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[500px] h-[300px] translate-y-1/2 blur-[100px] pointer-events-none"
            style={{ background: ACCENT, opacity: 0.05 }}
          />

          {/* dot grid texture */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: "28px 28px",
            }}
          />

          {/* content */}
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 mb-10">
              <span className="h-px w-8 bg-white/20" />
              <span className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/40">
                Open to work
              </span>
              <span className="h-px w-8 bg-white/20" />
            </div>

            <h2
              className="text-[52px] md:text-[80px] text-white mb-6 leading-[0.95] tracking-[-0.03em]"
              style={DISPLAY}
            >
              Find this
              <br />
              impressive?
            </h2>

            <p className="text-[16px] text-white/50 mb-14 max-w-sm mx-auto leading-relaxed">
              Available for senior backend and platform roles. I like queues,
              hyper-tables, and code that stays up at 3&nbsp;AM.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[14px] font-medium text-black transition-[filter] hover:brightness-110"
                style={{ background: ACCENT }}
              >
                Get in touch
                <svg
                  width="13"
                  height="13"
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
                href="https://github.com"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[14px] text-white/65 border border-white/10 transition-colors hover:text-white hover:border-white/20"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-white/50"
                >
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
                </svg>
                Star on GitHub
              </Link>
            </div>

            {/* meta row */}
            <div className="flex items-center justify-center gap-2 text-white/20">
              {["MIT licensed", "Built in 2 weekends", "0 investors"].map(
                (t, i, arr) => (
                  <Fragment key={t}>
                    <span className="text-[11px] font-mono uppercase tracking-[0.18em]">
                      {t}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                    )}
                  </Fragment>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
