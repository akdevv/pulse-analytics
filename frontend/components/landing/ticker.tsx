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
      className="relative border-y border-white/6 bg-black overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-32 z-10"
        style={{
          background: "linear-gradient(90deg, rgb(0 0 0), rgb(0 0 0 / 0))",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-32 z-10"
        style={{
          background: "linear-gradient(270deg, rgb(0 0 0), rgb(0 0 0 / 0))",
        }}
      />
      <div className="flex whitespace-nowrap py-5 animate-marquee">
        {items.map((t, i) => (
          <span
            key={i}
            className="mx-8 flex items-center gap-4 font-mono text-[12px] uppercase tracking-[0.24em] text-white/55"
          >
            <span style={{ color: ACCENT }}>✦</span>
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}
