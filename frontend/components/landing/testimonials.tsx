import { DISPLAY, SectionEyebrow, SectionHeading } from "./shared";

const ITEMS = [
  {
    quote:
      "Threw 10k RPS at it on a t3.medium. It didn’t flinch. I was honestly a little disappointed — I had the pager ready.",
    name: "stress-test.log",
    role: "Last Tuesday, 2 AM",
    avatar: "LT",
  },
  {
    quote:
      "Asked for 204 No Content. Got 204 No Content. Ten out of ten, would 204 again. Truly a visionary HTTP status.",
    name: "A very satisfied client",
    role: "curl -v · /collect",
    avatar: "cURL",
  },
  {
    quote:
      "Claude helped me plan this. I built it the old-fashioned way — one tab of docs, two coffees, zero frameworks I didn’t understand.",
    name: "Me",
    role: "Author, perpetual refactorer",
    avatar: "ME",
  },
];

export function Testimonials() {
  return (
    <section
      id="story"
      className="relative py-40 bg-black overflow-hidden"
    >
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start gap-6 mb-20 max-w-3xl">
          <SectionEyebrow>The story</SectionEyebrow>
          <SectionHeading
            line1="Not real customers."
            line2="Real commit messages."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/6 bg-white/6">
          {ITEMS.map(({ quote, name, role, avatar }) => (
            <figure
              key={name}
              className="flex flex-col p-8 transition-colors duration-300 hover:bg-white/3"
              style={{ background: "oklch(0.14 0.004 285)" }}
            >
              <svg
                aria-hidden
                width="20"
                height="16"
                viewBox="0 0 20 16"
                fill="none"
                className="text-white/20 mb-6"
              >
                <path
                  d="M7 16H0l4-8H1V0h6v8l-4 8h4Zm13 0h-7l4-8h-3V0h6v8l-4 8h4Z"
                  fill="currentColor"
                />
              </svg>
              <blockquote className="text-white/80 text-[15px] leading-[1.65] mb-10">
                {quote}
              </blockquote>
              <figcaption className="flex items-center gap-3 mt-auto pt-6 border-t border-white/6">
                <div className="w-9 h-9 rounded-full bg-white/6 flex items-center justify-center text-[11px] font-medium text-white/80 tracking-wide">
                  {avatar}
                </div>
                <div>
                  <div
                    className="text-[13px] font-medium text-white tracking-tight"
                    style={DISPLAY}
                  >
                    {name}
                  </div>
                  <div className="text-[11px] text-white/40">{role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
