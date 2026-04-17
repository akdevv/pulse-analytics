import { DISPLAY } from "./shared";

const STATS = [
  { value: "10,000", label: "Requests / second" },
  { value: "< 5ms", label: "Ingest p90" },
  { value: "0.00%", label: "Data loss" },
  { value: "< $40", label: "Monthly infra" },
];

export function StatsBand() {
  return (
    <section className="relative bg-black border-y border-white/6">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/6">
          {STATS.map(({ value, label }) => (
            <div key={label} className="px-8 py-10 text-center">
              <div
                className="text-[42px] md:text-[56px] text-white leading-none tracking-[-0.02em]"
                style={DISPLAY}
              >
                {value}
              </div>
              <div className="mt-3 text-[11px] font-mono uppercase tracking-[0.2em] text-white/40">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
