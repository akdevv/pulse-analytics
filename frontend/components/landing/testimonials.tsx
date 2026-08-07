import { ACCENT, DISPLAY, Reveal, SectionEyebrow, SectionHeading } from "./shared";

const ITEMS = [
  {
    quote:
      "Threw 10k RPS at it on a t3.medium. It didn't flinch. I was honestly a little disappointed — I had the pager ready.",
    name: "stress-test.log",
    role: "Last Tuesday, 2 AM",
    avatar: "ST",
    mono: true,
  },
  {
    quote:
      "Asked for 204 No Content. Got 204 No Content. Ten out of ten, would 204 again. Truly a visionary HTTP status.",
    name: "A very satisfied client",
    role: "curl -v · /collect",
    avatar: "cURL",
    mono: true,
  },
  {
    quote:
      "Claude helped me plan this. I built it the old-fashioned way — one tab of docs, two coffees, zero frameworks I didn't understand.",
    name: "Me",
    role: "Author, perpetual refactorer",
    avatar: "ME",
    mono: false,
  },
];

export function Testimonials() {
  return (
    <section
      id="story"
      className="relative py-40 overflow-hidden"
      style={{ background: "var(--pa-bg)" }}
    >
      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal className="flex flex-col items-start gap-6 mb-20 max-w-3xl">
          <SectionEyebrow>The story</SectionEyebrow>
          <SectionHeading
            line1="Not real customers."
            line2="Real commit messages."
          />
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ITEMS.map(({ quote, name, role, avatar, mono }, i) => (
            <Reveal
              as="figure"
              key={name}
              delay={i * 90}
              className="group relative flex flex-col rounded-2xl border border-white/8 p-8 overflow-hidden transition-[border-color,box-shadow] duration-[220ms] ease-[var(--ease-out)] hover:border-white/15 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]"
              style={{
                background:
                  "linear-gradient(160deg, oklch(0.18 0.005 285) 0%, oklch(0.145 0.003 285) 100%)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset",
              }}
            >
              {/* subtle top accent line on hover */}
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
                }}
              />

              {/* decorative quote mark */}
              <div
                aria-hidden
                className="absolute top-5 right-6 font-serif text-[80px] leading-none select-none pointer-events-none"
                style={{ color: ACCENT, opacity: 0.12 }}
              >
                &ldquo;
              </div>

              {/* quote text */}
              <blockquote className="relative text-white/80 text-[15px] leading-[1.7] mb-10 flex-1">
                {quote}
              </blockquote>

              {/* divider */}
              <div className="h-px bg-white/6 mb-6" />

              {/* author */}
              <figcaption className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-mono font-semibold shrink-0"
                  style={{
                    background:
                      "color-mix(in oklab, " + ACCENT + " 12%, oklch(0.18 0.004 285))",
                    color: ACCENT,
                    border: "1px solid color-mix(in oklab, " + ACCENT + " 20%, transparent)",
                  }}
                >
                  {avatar}
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-[13px] text-white truncate ${mono ? "font-mono" : "font-medium"}`}
                    style={mono ? undefined : DISPLAY}
                  >
                    {name}
                  </div>
                  <div className="text-[11px] font-mono text-white/40 mt-0.5 truncate">
                    {role}
                  </div>
                </div>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
