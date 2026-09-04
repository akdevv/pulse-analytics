import { ramp, ridgePath } from "@/components/auth/ridge-silhouette";
import { ACCENT, ACCENT_SOFT, DISPLAY } from "@/components/landing/tokens";

/* ── The panel ─────────────────────────────────────────────────
   A range of density curves stacked and offset, each occluding the one
   behind it. It is the shape a week of ingest makes, drawn as flat
   silhouettes rather than glowing lines so it holds an edge.

   Depth comes from tone, not opacity: each layer gets its own colour
   ramping toward the ground, computed in oklch so the steps are
   perceptually even. Stacking one shape at several opacities reads as a
   single form behind tracing paper instead of as ranges. */
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

export const AUTH_SKY = `linear-gradient(176deg, ${ACCENT_SOFT} 0%, ${ACCENT} 64%)`;

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")";

function Ranges({ className }: { className?: string }) {
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
    </svg>
  );
}

/* A gradient across a panel this wide bands without it. */
function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 opacity-[0.11] mix-blend-overlay"
      style={{ backgroundImage: GRAIN }}
    />
  );
}

function Figures({
  size = "lg",
}: {
  size?: "lg" | "sm";
}) {
  const big = size === "lg";
  return (
    <div className={`flex ${big ? "gap-10 xl:gap-12" : "gap-7"}`}>
      {FIGURES.map(({ v, k }) => (
        <div key={k}>
          <div
            className={`leading-none text-charcoal tabular-nums ${big ? "text-[22px]" : "text-[17px]"}`}
            style={{ ...DISPLAY, fontWeight: 700, letterSpacing: "-0.03em" }}
          >
            {v}
          </div>
          <div
            className={`mt-1.5 font-mono tracking-[0.16em] text-charcoal/60 uppercase ${big ? "text-[10px]" : "text-[9px]"}`}
          >
            {k}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Desktop half. Sticky, so the taller register form scrolls past the
 *  landscape rather than stretching it. */
export function AuthPanel() {
  return (
    <div
      className="relative hidden flex-col overflow-hidden lg:sticky lg:top-0 lg:flex lg:h-dvh"
      style={{ background: AUTH_SKY }}
    >
      <Grain />

      <div className="relative flex flex-1 flex-col justify-end p-14 pb-0 xl:p-16 xl:pb-0">
        <h2
          className="max-w-[11ch] pb-12 text-[clamp(2.6rem,4.4vw,4.8rem)] leading-[0.89] text-charcoal"
          style={{ ...DISPLAY, fontWeight: 700, letterSpacing: "-0.052em" }}
        >
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

/** Small screens keep the range as a footer band, carrying the figures
 *  with it, so the form still sits entirely above the fold. */
export function AuthPanelMobile() {
  return (
    <div
      className="relative h-[186px] shrink-0 overflow-hidden lg:hidden"
      style={{ background: AUTH_SKY }}
    >
      <Grain />
      <Ranges className="absolute inset-x-0 bottom-0 h-[74%] w-full" />
      <div className="relative z-20 px-6 pt-5">
        <Figures size="sm" />
      </div>
    </div>
  );
}
