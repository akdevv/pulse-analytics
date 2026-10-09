"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChartColumn,
  Cog,
  Database,
  Layers,
  MousePointerClick,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "./motion";

// Stage geometry, in SVG user units. Top row runs right, bottom row runs back.
const VB = { w: 800, h: 440 };
const PATH = "M110 100 H690 C800 100 800 340 690 340 H110";

type Stop = {
  icon: LucideIcon;
  name: string;
  where: string;
  metric: string;
  ms: number;
  x: number;
  y: number;
  title: string;
  body: string;
};

// Timings are illustrative: ingest is the measured p90, the rest follow the
// worker's 1 s flush interval.
const STOPS: Stop[] = [
  {
    icon: MousePointerClick,
    name: "Browser",
    where: "pulse.js · 3 KB",
    metric: "GET /track",
    ms: 0,
    x: 110,
    y: 100,
    title: "Someone loads a page.",
    body: "The script sends one GET with the path, referrer and screen size. No cookie, nothing stored on the device.",
  },
  {
    icon: Zap,
    name: "Ingest",
    where: "Express",
    metric: "204 · 4.8 ms",
    ms: 4.8,
    x: 400,
    y: 100,
    title: "Answered before it matters.",
    body: "Validate, rate-limit, enqueue, return 204. That is the only part the visitor ever waits on.",
  },
  {
    icon: Layers,
    name: "Queue",
    where: "BullMQ · Redis",
    metric: "+1 job",
    ms: 5.4,
    x: 690,
    y: 100,
    title: "The queue takes the spike.",
    body: "A traffic burst piles up in Redis instead of in the database. Nothing upstream slows down.",
  },
  {
    icon: Cog,
    name: "Worker",
    where: "Parse · geo · batch",
    metric: "batch 100/100",
    ms: 620,
    x: 690,
    y: 340,
    title: "A worker does the slow part.",
    body: "Parse the user agent, look up the country, drop the IP. Events are written 100 at a time.",
  },
  {
    icon: Database,
    name: "TimescaleDB",
    where: "Continuous aggregate",
    metric: "INSERT 100",
    ms: 660,
    x: 400,
    y: 340,
    title: "Rollups keep themselves current.",
    body: "Hourly rollups update in the background, so a 30-day chart adds up hundreds of rows, not millions.",
  },
  {
    icon: ChartColumn,
    name: "Dashboard",
    where: "Next.js · SSE",
    metric: "+1 pageview",
    ms: 900,
    x: 110,
    y: 340,
    title: "And it's on the chart.",
    body: "The realtime count ticks over the open connection. Round trip done in under a second.",
  },
];

// Scroll progress spent holding still before the trip starts and after it ends.
const LEAD = 0.05;
const TAIL = 0.1;

const clamp = (v: number) => Math.min(1, Math.max(0, v));

export function RoundTrip() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<SVGPathElement>(null);
  const packet = useRef<SVGGElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const stops = useRef<number[]>(STOPS.map((_, i) => i / (STOPS.length - 1)));

  // Where each stop sits along the path, as a fraction of its length.
  useEffect(() => {
    const path = track.current;
    if (!path) return;
    const total = path.getTotalLength();
    stops.current = STOPS.map(({ x, y }) => {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i <= 400; i++) {
        const pt = path.getPointAtLength((i / 400) * total);
        const d = (pt.x - x) ** 2 + (pt.y - y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i / 400;
        }
      }
      return best;
    });
  }, []);

  useEffect(() => {
    const root = section.current;
    const path = track.current;
    if (!root || !path) return;
    const total = path.getTotalLength();
    let raf = 0;

    const render = (t: number) => {
      const marks = stops.current;
      let i = 0;
      while (i < marks.length - 1 && t >= marks[i + 1] - 0.002) i++;
      setActive(i);

      const pt = path.getPointAtLength(t * total);
      packet.current?.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
      root.style.setProperty("--t", t.toFixed(4));
      stage.current?.style.setProperty("--px", `${(pt.x / VB.w) * 100}%`);
      stage.current?.style.setProperty("--py", `${(pt.y / VB.h) * 100}%`);

      // Interpolate the clock between the two stops the packet sits between.
      const next = Math.min(i + 1, marks.length - 1);
      const span = marks[next] - marks[i] || 1;
      const local = clamp((t - marks[i]) / span);
      const ms = STOPS[i].ms + (STOPS[next].ms - STOPS[i].ms) * local;
      if (clock.current)
        clock.current.textContent =
          ms < 100 ? `${ms.toFixed(1)} ms` : `${(ms / 1000).toFixed(2)} s`;
    };

    if (reduced) {
      render(1);
      return;
    }

    const update = () => {
      raf = 0;
      const r = root.getBoundingClientRect();
      const run = root.offsetHeight - window.innerHeight;
      const p = run > 0 ? clamp(-r.top / run) : 1;
      render(clamp((p - LEAD) / (1 - LEAD - TAIL)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced]);

  const jumpTo = (i: number) => {
    const root = section.current;
    if (!root) return;
    const run = root.offsetHeight - window.innerHeight;
    const p = LEAD + stops.current[i] * (1 - LEAD - TAIL);
    const top = root.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + p * run + 2, behavior: "smooth" });
  };

  return (
    <section
      ref={section}
      id="round-trip"
      aria-labelledby="round-trip-title"
      className={cn("relative", reduced ? "py-24" : "h-[460vh]")}
      style={{ "--t": 0 } as React.CSSProperties}
    >
      <div
        className={cn(
          "flex items-center",
          !reduced && "sticky top-0 h-svh overflow-hidden"
        )}
      >
        <div className="mx-auto w-full max-w-6xl px-5 pt-16 sm:px-6 md:pt-20">
          <header className="mb-6 flex flex-col gap-3 md:mb-10 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 text-[12.5px] text-ink/50">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-tangerine opacity-70" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-tangerine" />
                </span>
                Scroll to follow one event
              </p>
              <h2
                id="round-trip-title"
                className="font-display text-[30px] leading-[1.02] font-semibold tracking-[-0.035em] text-balance text-ink sm:text-[44px] lg:text-[52px]"
              >
                The round trip.{" "}
                <span className="text-ink/35">Click to chart.</span>
              </h2>
            </div>
            <dl className="flex gap-6 font-mono text-[12px] md:text-right">
              <div>
                <dt className="text-ink/40">Visitor waited</dt>
                <dd
                  className={cn(
                    "mt-0.5 text-[15px] tabular-nums transition-colors duration-300",
                    active >= 1 ? "text-powder" : "text-ink/30"
                  )}
                >
                  {active >= 1 ? "4.8 ms" : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink/40">Click to chart</dt>
                <dd className="mt-0.5 text-[15px] text-tangerine-soft tabular-nums">
                  <span ref={clock}>0.0 ms</span>
                </dd>
              </div>
            </dl>
          </header>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-10">
            <ol className="relative order-2 lg:order-1">
              {STOPS.map((s, i) => (
                <li
                  key={s.name}
                  className={cn("relative", i !== active && "hidden lg:block")}
                >
                  {i < STOPS.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute top-10 -bottom-1 left-[13.5px] hidden w-px overflow-hidden bg-ink/10 lg:block"
                    >
                      <span
                        className={cn(
                          "block size-full origin-top bg-linear-to-b from-tangerine to-tangerine-soft transition-transform duration-500 ease-out",
                          i < active ? "scale-y-100" : "scale-y-0"
                        )}
                      />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => jumpTo(i)}
                    aria-current={i === active ? "step" : undefined}
                    className="group relative grid w-full cursor-pointer grid-cols-[28px_minmax(0,1fr)] gap-4 rounded-xl py-2 text-left"
                  >
                    <span
                      className={cn(
                        "relative z-10 mt-0.5 grid size-7 place-items-center rounded-full border font-mono text-[11px] tabular-nums transition-all duration-300 ease-out",
                        i < active &&
                          "border-tangerine/50 bg-tangerine/15 text-tangerine-soft",
                        i === active &&
                          "scale-110 border-tangerine bg-tangerine text-charcoal shadow-[0_0_0_5px_color-mix(in_oklab,var(--color-tangerine)_18%,transparent)]",
                        i > active &&
                          "border-ink/15 bg-charcoal text-ink/40 group-hover:border-ink/35 group-hover:text-ink/70"
                      )}
                    >
                      {i + 1}
                    </span>
                    <span>
                      <span
                        className={cn(
                          "block font-display text-[16px] leading-snug font-semibold tracking-display transition-colors duration-300 sm:text-[17px]",
                          i === active
                            ? "text-ink"
                            : "text-ink/35 group-hover:text-ink/60"
                        )}
                      >
                        {s.title}
                      </span>
                      <span
                        className={cn(
                          "grid transition-[grid-template-rows,opacity] duration-500 ease-out",
                          i === active
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0"
                        )}
                      >
                        <span className="overflow-hidden">
                          <span className="block pt-1.5 text-[14px] leading-relaxed text-pretty text-ink/55">
                            {s.body}
                          </span>
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <div
              ref={stage}
              className="pa-stage relative order-1 overflow-hidden rounded-3xl border border-ink/8 bg-surface-1/50 shadow-edge lg:order-2"
            >
              <div aria-hidden className="pa-grid-pan absolute inset-0" />
              <div aria-hidden className="pa-stage-glow absolute inset-0" />
              <div className="relative aspect-[800/440]">
                <svg
                  viewBox={`0 0 ${VB.w} ${VB.h}`}
                  className="absolute inset-0 size-full overflow-visible"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="rt-line" x1="0" x2="1">
                      <stop offset="0" stopColor="var(--color-tangerine)" />
                      <stop
                        offset="1"
                        stopColor="var(--color-tangerine-soft)"
                      />
                    </linearGradient>
                    <radialGradient id="rt-halo">
                      <stop
                        offset="0"
                        stopColor="var(--color-tangerine)"
                        stopOpacity="0.55"
                      />
                      <stop
                        offset="1"
                        stopColor="var(--color-tangerine)"
                        stopOpacity="0"
                      />
                    </radialGradient>
                  </defs>
                  <path
                    ref={track}
                    d={PATH}
                    fill="none"
                    stroke="var(--color-ink)"
                    strokeOpacity="0.14"
                    strokeWidth="2"
                    strokeDasharray="2 8"
                    strokeLinecap="round"
                  />
                  <path
                    d={PATH}
                    pathLength={1}
                    fill="none"
                    stroke="url(#rt-line)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="1 1"
                    style={{ strokeDashoffset: "calc(1 - var(--t))" }}
                    className="drop-shadow-[0_0_6px_var(--pa-accent-glow)]"
                  />
                  <g
                    ref={packet}
                    transform={`translate(${STOPS[0].x} ${STOPS[0].y})`}
                  >
                    <circle r="34" fill="url(#rt-halo)" className="pa-halo" />
                    <circle r="7" fill="var(--color-tangerine-soft)" />
                    <circle r="3" fill="white" fillOpacity="0.9" />
                  </g>
                </svg>

                <Inspector active={active} />
                {STOPS.map((s, i) => (
                  <StopCard key={s.name} stop={s} index={i} active={active} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StopCard({
  stop,
  index,
  active,
}: {
  stop: Stop;
  index: number;
  active: number;
}) {
  const Icon = stop.icon;
  const lit = index <= active;
  const current = index === active;
  const below = stop.y > VB.h / 2;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${(stop.x / VB.w) * 100}%`,
        top: `${(stop.y / VB.h) * 100}%`,
      }}
    >
      <div
        className={cn(
          "relative flex flex-col items-center gap-1.5 transition-transform duration-500 ease-out",
          current && "scale-[1.06]"
        )}
      >
        <span
          className={cn(
            "grid size-10 place-items-center rounded-2xl border backdrop-blur-sm transition-all duration-500 ease-out sm:size-14",
            current
              ? "border-tangerine/60 bg-tangerine/20 text-tangerine-soft shadow-[0_0_0_6px_color-mix(in_oklab,var(--color-tangerine)_10%,transparent),0_16px_40px_-10px_var(--pa-accent-glow)]"
              : lit
                ? "border-tangerine/25 bg-charcoal/90 text-tangerine-soft/80"
                : "border-ink/10 bg-charcoal/90 text-ink/40"
          )}
        >
          <Icon className="size-4 sm:size-5" />
        </span>
        <span
          className={cn(
            "absolute left-1/2 w-max -translate-x-1/2 text-center",
            below ? "top-full mt-2" : "bottom-full mb-2"
          )}
        >
          <span
            className={cn(
              "block text-[10.5px] font-medium transition-colors duration-300 sm:text-[13px]",
              lit ? "text-ink" : "text-ink/40"
            )}
          >
            {stop.name}
          </span>
          <span className="hidden text-[11.5px] text-ink/40 sm:block">
            {stop.where}
          </span>
        </span>
        <span
          className={cn(
            "absolute left-1/2 w-max -translate-x-1/2 rounded-full border border-tangerine/30 bg-charcoal/90 px-2.5 py-1 font-mono text-[10px] whitespace-nowrap text-tangerine-soft backdrop-blur transition-all duration-400 ease-out sm:text-[11px]",
            below ? "bottom-full mb-2" : "top-full mt-2",
            current
              ? "translate-y-0 opacity-100"
              : cn("opacity-0", below ? "translate-y-1" : "-translate-y-1")
          )}
        >
          {stop.metric}
        </span>
      </div>
    </div>
  );
}

// The panel in the middle of the loop: what the event looks like at each stop.
function Inspector({ active }: { active: number }) {
  return (
    <div className="absolute top-1/2 left-1/2 hidden w-[44%] -translate-x-1/2 -translate-y-1/2 sm:block">
      <div className="relative h-[118px] overflow-hidden rounded-2xl border border-ink/8 bg-well/80 font-mono text-[11.5px] leading-[1.75] shadow-well backdrop-blur md:h-[132px]">
        <div className="flex items-center gap-2 border-b border-ink/6 px-3.5 py-1.5 text-[10.5px] text-ink/40">
          <span className="size-1.5 rounded-full bg-tangerine" />
          {INSPECT[active].label}
        </div>
        {INSPECT.map((panel, i) => (
          <div
            key={panel.label}
            aria-hidden={i !== active}
            className={cn(
              "absolute inset-x-0 top-8 bottom-0 px-3.5 py-2 transition-[opacity,translate,filter] duration-500 ease-out",
              i === active
                ? "translate-y-0 opacity-100"
                : cn(
                    "pointer-events-none opacity-0 blur-[2px]",
                    i < active ? "-translate-y-3" : "translate-y-3"
                  )
            )}
          >
            {panel.body(i === active)}
          </div>
        ))}
      </div>
    </div>
  );
}

const K = "text-tangerine-soft";
const S = "text-powder";
const D = "text-ink/35";

const INSPECT: { label: string; body: (on: boolean) => React.ReactNode }[] = [
  {
    label: "GET /track",
    body: () => (
      <div className="text-ink/70">
        <div>
          <span className={D}>?</span>tid=<span className={S}>pk-8f2c…</span>
        </div>
        <div>
          <span className={D}>&amp;</span>path=
          <span className={S}>/pricing</span>
        </div>
        <div>
          <span className={D}>&amp;</span>ref=
          <span className={S}>news.ycombinator.com</span>
        </div>
      </div>
    ),
  },
  {
    label: "response",
    body: () => (
      <div className="text-ink/70">
        <div>
          HTTP/1.1 <span className={K}>204</span> No Content
        </div>
        <div>
          <span className={D}>x-response-time:</span> 4.8ms
        </div>
        <div className={D}>{"// body: none, cookie: none"}</div>
      </div>
    ),
  },
  {
    label: "bull:events · waiting",
    body: (on) => (
      <div className="flex h-full items-end gap-1 pb-2">
        {Array.from({ length: 22 }, (_, i) => (
          <span
            key={i}
            className="flex-1 origin-bottom rounded-sm bg-tangerine/60 transition-transform duration-700 ease-out"
            style={{
              height: `${22 + Math.abs(Math.sin(i * 1.7)) * 60}%`,
              transform: on ? "scaleY(1)" : "scaleY(0.1)",
              transitionDelay: `${i * 18}ms`,
            }}
          />
        ))}
      </div>
    ),
  },
  {
    label: "batch · 100 rows → 1 insert",
    body: (on) => (
      <div className="grid grid-cols-20 gap-[3px] pt-1">
        {Array.from({ length: 100 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "aspect-square rounded-[2px] transition-colors duration-300",
              on ? "bg-tangerine/70" : "bg-ink/8"
            )}
            style={{ transitionDelay: on ? `${i * 6}ms` : "0ms" }}
          />
        ))}
      </div>
    ),
  },
  {
    label: "timescaledb",
    body: () => (
      <div className="text-ink/70">
        <div>
          <span className={K}>INSERT INTO</span> events{" "}
          <span className={D}>…</span>
        </div>
        <div className={D}>-- 100 rows, 1 round trip</div>
        <div>
          <span className={K}>hourly_pageviews</span>{" "}
          <span className={S}>↻</span> refreshed
        </div>
      </div>
    ),
  },
  {
    label: "pageviews · today",
    body: (on) => (
      <div className="flex h-full items-end gap-1.5 pb-2">
        {[38, 52, 44, 61, 57, 70, 66, 74, 81].map((h, i, all) => (
          <span
            key={i}
            className={cn(
              "flex-1 origin-bottom rounded-t-sm transition-transform duration-700 ease-out",
              i === all.length - 1 ? "bg-tangerine" : "bg-ink/15"
            )}
            style={{
              height: `${h}%`,
              transform:
                i === all.length - 1 && !on ? "scaleY(0.88)" : "scaleY(1)",
              transitionDelay: on ? "250ms" : "0ms",
            }}
          />
        ))}
      </div>
    ),
  },
];
