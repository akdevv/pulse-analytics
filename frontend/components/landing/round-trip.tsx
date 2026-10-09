"use client";

import { useEffect, useRef, useState } from "react";
import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "./motion";

type Stop = {
  name: string;
  tech: string;
  ms: number;
  title: string;
  body: string;
};

// Timings are illustrative except ingest, the measured p90. The rest follow
// the worker's 1 s flush interval.
const STOPS: Stop[] = [
  {
    name: "Browser",
    tech: "pulse.js · 3 KB",
    ms: 0,
    title: "Someone opens a page.",
    body: "The script sends one GET with the path, referrer, language and screen size. No cookies. A random visitor ID lives in localStorage.",
  },
  {
    name: "Ingest",
    tech: "Express",
    ms: 4.8,
    title: "Answered before it matters.",
    body: "Validate, rate-limit, enqueue, return 204. That is the only part of the trip the visitor ever waits on.",
  },
  {
    name: "Queue",
    tech: "BullMQ · Redis",
    ms: 5.4,
    title: "The queue takes the spike.",
    body: "A burst of traffic piles up in Redis instead of in the database, so nothing upstream slows down.",
  },
  {
    name: "Worker",
    tech: "Node worker",
    ms: 620,
    title: "A worker does the slow part.",
    body: "It parses the user agent, looks up the country and drops the IP. Events are written 100 at a time.",
  },
  {
    name: "Database",
    tech: "TimescaleDB",
    ms: 660,
    title: "Rollups keep themselves current.",
    body: "Hourly rollups update in the background, so a 30-day chart adds up hundreds of rows instead of millions.",
  },
  {
    name: "Dashboard",
    tech: "Next.js · SSE",
    ms: 900,
    title: "And it's on the chart.",
    body: "The realtime count ticks over an open connection. The whole trip took under a second.",
  },
];

const LAST = STOPS.length - 1;
// Scroll spent holding still before the trip starts and after it ends.
const LEAD = 0.08;
const TAIL = 0.12;

const clamp = (v: number) => Math.min(1, Math.max(0, v));

function formatMs(ms: number) {
  return ms < 100 ? `${ms.toFixed(1)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

export function RoundTrip() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = section.current;
    if (!root) return;
    let raf = 0;

    const render = (t: number) => {
      const pos = t * LAST;
      const i = Math.min(LAST, Math.floor(pos + 0.0001));
      setActive(i);
      track.current?.style.setProperty("--t", t.toFixed(4));
      const next = Math.min(LAST, i + 1);
      const ms = STOPS[i].ms + (STOPS[next].ms - STOPS[i].ms) * (pos - i);
      if (clock.current) clock.current.textContent = formatMs(ms);
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
    const p = LEAD + (i / LAST) * (1 - LEAD - TAIL);
    const top = root.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + p * run + 2, behavior: "smooth" });
  };

  return (
    <section
      ref={section}
      id="round-trip"
      aria-labelledby="round-trip-title"
      className={cn("relative", reduced ? "py-24" : "h-[300vh]")}
    >
      <div
        className={cn(
          "flex items-center",
          !reduced && "sticky top-0 h-svh overflow-hidden"
        )}
      >
        <div className="mx-auto w-full max-w-6xl px-6 pt-16">
          <div className="mb-7 flex items-center gap-2">
            <Hash
              aria-hidden
              size={14}
              strokeWidth={2}
              className="shrink-0 text-tangerine"
            />
            <span className="text-[13.5px] font-medium text-ink/80">
              The round trip
            </span>
            <span aria-hidden className="ml-3 h-px flex-1 bg-ink/10" />
          </div>

          <h2
            id="round-trip-title"
            className="font-display text-[34px] leading-[1.02] font-semibold tracking-[-0.035em] text-balance text-ink sm:text-[44px] lg:text-[52px]"
          >
            From a click to a chart.{" "}
            <span className="text-ink/35">In under a second.</span>
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-6 md:mt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end lg:gap-14">
            <div>
              <p className="text-[12.5px] text-ink/45">Since the click</p>
              <p className="mt-2 font-display text-[64px] leading-none font-semibold tracking-[-0.045em] text-tangerine-soft tabular-nums sm:text-[88px] lg:text-[104px]">
                <span ref={clock}>0.0 ms</span>
              </p>
            </div>

            <div className="grid min-h-[132px] [&>*]:col-start-1 [&>*]:row-start-1">
              {STOPS.map((s, i) => (
                <div
                  key={s.name}
                  aria-hidden={!reduced && i !== active}
                  className={cn(
                    "self-end transition-[opacity,translate,filter] duration-500 ease-out",
                    reduced
                      ? i === LAST
                        ? "opacity-100"
                        : "hidden"
                      : i === active
                        ? "translate-y-0 opacity-100"
                        : cn(
                            "pointer-events-none opacity-0 blur-[2px]",
                            i < active ? "-translate-y-3" : "translate-y-3"
                          )
                  )}
                >
                  <p className="font-display text-[24px] leading-tight font-semibold tracking-display text-balance text-ink sm:text-[30px]">
                    {s.title}
                  </p>
                  <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-pretty text-ink/60">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            ref={track}
            className="relative mt-14 md:mt-20"
            style={{ "--t": 0 } as React.CSSProperties}
          >
            <div className="relative mx-[5px] h-px bg-ink/12">
              <div
                aria-hidden
                className="absolute inset-0 origin-left bg-linear-to-r from-tangerine/40 to-tangerine-soft"
                style={{ transform: "scaleX(var(--t))" }}
              />
              <span
                aria-hidden
                className="pa-comet absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-tangerine-soft"
                style={{ left: "calc(var(--t) * 100%)" }}
              />
            </div>

            <ol className="relative mt-5 h-10 sm:h-12">
              {STOPS.map((s, i) => (
                <li
                  key={s.name}
                  className={cn(
                    "absolute top-0 w-max",
                    i === 0
                      ? "text-left"
                      : i === LAST
                        ? "-translate-x-full text-right"
                        : "-translate-x-1/2 text-center"
                  )}
                  style={{ left: `${(i / LAST) * 100}%` }}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -top-[25px] size-2.5 rounded-full border transition-[background-color,border-color,box-shadow] duration-300",
                      i === 0
                        ? "left-0"
                        : i === LAST
                          ? "right-0"
                          : "left-1/2 -translate-x-1/2",
                      i <= active
                        ? "border-tangerine-soft bg-tangerine-soft"
                        : "border-ink/25 bg-charcoal",
                      i === active &&
                        "shadow-[0_0_0_5px_color-mix(in_oklab,var(--color-tangerine)_18%,transparent)]"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => jumpTo(i)}
                    aria-current={i === active ? "step" : undefined}
                    className={cn(
                      "cursor-pointer rounded-md px-1 py-0.5 transition-opacity duration-300",
                      // Six labels don't fit side by side on a phone.
                      i !== active &&
                        "max-sm:pointer-events-none max-sm:opacity-0"
                    )}
                  >
                    <span
                      className={cn(
                        "block text-[11.5px] font-medium transition-colors duration-300 sm:text-[13.5px]",
                        i === active
                          ? "text-ink"
                          : i < active
                            ? "text-ink/60"
                            : "text-ink/35 hover:text-ink/60"
                      )}
                    >
                      {s.name}
                    </span>
                    <span className="mt-0.5 hidden font-mono text-[11px] text-ink/35 sm:block">
                      {s.tech}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
