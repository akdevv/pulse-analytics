import { DISPLAY, Reveal } from "./shared";

const STATS = [
  { value: "10,000", label: "Requests / second" },
  { value: "< 5ms", label: "Ingest p90" },
  { value: "0.00%", label: "Data loss" },
  { value: "< $40", label: "Monthly infra" },
];

export function StatsBand() {
  return (
    <section
      className="relative border-y border-white/8"
      style={{ background: "var(--pa-bg)" }}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 divide-x divide-y divide-white/8 lg:grid-cols-4 lg:divide-y-0">
          {STATS.map(({ value, label }, i) => (
            <Reveal
              key={label}
              delay={i * 70}
              className="group px-8 py-12 text-center transition-colors duration-200 ease-[var(--ease-out)] hover:bg-white/[0.02]"
            >
              <div
                className="text-[42px] leading-none tracking-[-0.025em] text-white transition-transform duration-300 ease-[var(--ease-out)] group-hover:-translate-y-0.5 md:text-[56px]"
                style={DISPLAY}
              >
                {value}
              </div>
              <div className="mt-3 font-mono text-[11px] tracking-[0.2em] text-white/40 uppercase">
                {label}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
