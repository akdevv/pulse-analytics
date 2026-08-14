import { ACCENT } from "./shared";

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
      className="relative overflow-hidden border-y border-white/8"
      style={{ background: "var(--pa-bg)" }}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-40"
        style={{
          background:
            "linear-gradient(90deg, var(--pa-bg), oklch(0.145 0.004 285 / 0))",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-40"
        style={{
          background:
            "linear-gradient(270deg, var(--pa-bg), oklch(0.145 0.004 285 / 0))",
        }}
      />
      <div className="animate-marquee flex py-5 whitespace-nowrap">
        {items.map((t, i) => (
          <span
            key={i}
            className="mx-8 flex items-center gap-4 font-mono text-[12px] tracking-[0.24em] text-white/55 uppercase"
          >
            <span style={{ color: ACCENT }}>✦</span>
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}
