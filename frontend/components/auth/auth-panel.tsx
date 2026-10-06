import Link from "next/link";

import { ramp, ridgePath } from "@/components/auth/ridge-silhouette";
import { PulseLogo } from "@/components/landing/shared";

const W = 600;
const H = 280;
const TONES = ramp(5, [0.63, 0.185, 40], [0.174, 0.014, 31]);
const RIDGES = TONES.map((fill, i) => ({
  fill,
  d: ridgePath({
    seed: 2207 + i * 1489,
    base: 96 + i * 36,
    amp: 84 - i * 9,
    w: W,
    h: H,
    bumps: 5,
    sharp: 0.8,
  }),
}));

const FIGURES = [
  { v: "10,000", k: "events / sec" },
  { v: "4.8ms", k: "ingest p90" },
  { v: "0.00%", k: "data loss" },
];

const AUTH_SKY = `linear-gradient(176deg, var(--color-tangerine-soft) 0%, var(--color-tangerine) 64%)`;

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")";

// A final ridge in the page colour lets the mobile band fade into the form.
const GROUND = ridgePath({
  seed: 9901,
  base: 250,
  amp: 34,
  w: W,
  h: H,
  bumps: 4,
  sharp: 0.8,
});

function Ranges({
  className,
  ground = false,
}: {
  className?: string;
  ground?: boolean;
}) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      {RIDGES.map(({ d, fill }, i) => (
        <path key={i} d={d} fill={fill} />
      ))}
      {ground && <path d={GROUND} fill="var(--color-charcoal)" />}
    </svg>
  );
}

function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 opacity-[0.11] mix-blend-overlay"
      style={{ backgroundImage: GRAIN }}
    />
  );
}

function Figures() {
  return (
    <div className="flex gap-10 xl:gap-12">
      {FIGURES.map(({ v, k }) => (
        <div key={k}>
          <div
            className={`font-display text-[22px] leading-none font-bold tracking-[-0.03em] text-charcoal tabular-nums`}
          >
            {v}
          </div>
          <div
            className={`mt-1.5 font-mono text-[10px] tracking-[0.16em] text-charcoal/60 uppercase`}
          >
            {k}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuthPanel() {
  return (
    <div
      className="relative hidden flex-col overflow-hidden lg:sticky lg:top-0 lg:flex lg:h-dvh"
      style={{ background: AUTH_SKY }}
    >
      <Grain />

      <div className="relative flex flex-1 flex-col justify-end p-14 pb-0 xl:p-16 xl:pb-0">
        <h2 className="max-w-[11ch] pb-12 font-display text-[clamp(2.6rem,4.4vw,4.8rem)] leading-[0.89] font-bold tracking-[-0.052em] text-charcoal">
          Ten thousand events a second.
        </h2>
      </div>

      <div className="relative px-14 xl:px-16">
        <div className="h-px w-full bg-charcoal/30" />
        <div className="py-6">
          <Figures />
        </div>
      </div>

      <Ranges className="relative h-[38%] w-full shrink-0" />
    </div>
  );
}

export function AuthPanelMobile() {
  return (
    <div
      className="relative h-[172px] shrink-0 overflow-hidden sm:h-[200px] lg:hidden"
      style={{ background: AUTH_SKY }}
    >
      <Grain />
      <Ranges ground className="absolute inset-x-0 bottom-0 h-[78%] w-full" />
      <header className="relative z-20 px-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-full focus-visible:ring-2 focus-visible:ring-charcoal/60 focus-visible:outline-none"
        >
          <PulseLogo size={26} />
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-charcoal">
            Pulse Analytics
          </span>
        </Link>
      </header>
    </div>
  );
}
