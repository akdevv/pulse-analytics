import Link from "next/link";
import { ACCENT, ACCENT_SOFT, DISPLAY } from "./tokens";
import { Reveal } from "./shared";

const SKILLS = [
  "Queues",
  "Hyper-tables",
  "Backpressure",
  "Sub-5ms p90",
  "0 downtime",
];

export function CTA() {
  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-charcoal py-28 md:py-40"
    >
      <Reveal className="relative mx-auto max-w-5xl px-6">
        <div
          className="relative overflow-hidden rounded-3xl border border-ink/10 px-8 py-16 sm:px-14 sm:py-20"
          style={{
            background:
              "linear-gradient(160deg, oklch(0.2750 0 0) 0%, oklch(0.2100 0 0) 55%, oklch(0.1750 0 0) 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(229,227,210,0.06), 0 40px 100px -40px rgba(0,0,0,0.7)",
          }}
        >
          {/* top accent line */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent 5%, ${ACCENT} 50%, transparent 95%)`,
              opacity: 0.6,
            }}
          />
          {/* ambient corner glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-20 h-[360px] w-[360px] rounded-full blur-[110px]"
            style={{ background: ACCENT, opacity: 0.12 }}
          />
          {/* dot grid */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, #E5E3D2 1px, transparent 0)`,
              backgroundSize: "26px 26px",
            }}
          />

          <div className="relative z-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            {/* left — pitch */}
            <div>
              <div
                className="mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1"
                style={{
                  borderColor:
                    "color-mix(in oklab, " + ACCENT + " 30%, transparent)",
                  background:
                    "color-mix(in oklab, " + ACCENT + " 10%, transparent)",
                }}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-powder opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-powder" />
                </span>
                <span className="font-mono text-[11px] tracking-[0.2em] text-ink/70 uppercase">
                  Available · June 2026
                </span>
              </div>

              <h2
                className="mb-5 text-[44px] leading-[0.95] tracking-[-0.03em] text-ink sm:text-[60px]"
                style={DISPLAY}
              >
                Find this
                <br />
                <span className="text-ink/55">impressive?</span>
              </h2>

              <p className="mb-8 max-w-md text-[16px] leading-relaxed text-ink/55">
                Available for senior backend and platform roles. I like queues,
                hyper-tables, and code that stays up at 3&nbsp;AM.
              </p>

              <div className="flex flex-wrap gap-1.5">
                {SKILLS.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-ink/10 bg-ink/[0.03] px-2.5 py-1 font-mono text-[11px] text-ink/60"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* right — action card */}
            <div
              className="flex flex-col gap-3 rounded-2xl border border-ink/10 p-6"
              style={{
                background: "oklch(0.2350 0 0)",
                boxShadow: "inset 0 1px 0 rgba(229,227,210,0.04)",
              }}
            >
              <Link
                href="/register"
                className="pa-btn group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-semibold text-charcoal"
                style={{
                  background: `linear-gradient(180deg, ${ACCENT_SOFT}, ${ACCENT})`,
                  boxShadow:
                    "0 1px 0 0 rgba(229,227,210,0.35) inset, 0 10px 30px -10px var(--pa-accent-glow)",
                }}
              >
                <span className="relative z-10">Get in touch</span>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="relative z-10 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>

              <Link
                href="https://github.com/akdevv/pulse-analytics"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-ink/12 bg-ink/[0.02] px-6 py-3.5 text-[14px] text-ink/75 transition-[color,border-color,background-color,transform] duration-150 ease-[var(--ease-out)] hover:border-ink/25 hover:bg-ink/[0.04] hover:text-ink active:scale-[0.97]"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-ink/55"
                >
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
                </svg>
                Star on GitHub
              </Link>

              <div className="mt-1 flex items-center justify-center gap-2 text-ink/55">
                {["MIT", "2 weekends", "0 investors"].map((t, i, arr) => (
                  <span key={t} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tracking-[0.16em] uppercase">
                      {t}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="h-0.5 w-0.5 rounded-full bg-ink/25" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
