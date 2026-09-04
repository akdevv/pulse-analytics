import { POWDER } from "./tokens";

const STACK = [
  "Node.js",
  "TypeScript",
  "Express",
  "Next.js",
  "Tailwind",
  "Redis",
  "RabbitMQ",
  "TimescaleDB",
  "PostgreSQL",
  "Docker",
  "AWS",
  "Nginx",
];

export function Ticker() {
  const items = [...STACK, ...STACK];
  return (
    <section
      id="stack"
      className="relative overflow-hidden border-y border-ink/8 bg-charcoal"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-40 bg-gradient-to-r from-charcoal to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-40 bg-gradient-to-l from-charcoal to-transparent" />
      <div className="animate-marquee flex py-5 whitespace-nowrap">
        {items.map((t, i) => (
          <span
            key={i}
            className="mx-8 flex items-center gap-4 font-mono text-[12px] tracking-[0.24em] text-ink/55 uppercase"
          >
            <svg
              width="7"
              height="7"
              viewBox="0 0 8 8"
              aria-hidden
              style={{ color: POWDER, opacity: 0.65 }}
            >
              <path d="M4 0 5 3l3 1-3 1-1 3-1-3-3-1 3-1z" fill="currentColor" />
            </svg>
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}
