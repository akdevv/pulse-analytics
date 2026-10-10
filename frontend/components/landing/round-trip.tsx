"use client";

import { useEffect, useRef, useState } from "react";
import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "./motion";
import type { LabelKey, LabelPos } from "./round-trip-scene";

type Stop = {
  name: string;
  ms: number;
  title: string;
  body: string;
};

// Timings are illustrative except ingest, the measured p90. The rest follow
// the worker's 1 s flush interval.
const STOPS: Stop[] = [
  {
    name: "Browser",
    ms: 0,
    title: "Someone opens a page.",
    body: "The script sends one GET with the path, referrer, language and screen size. No cookies. A random visitor ID lives in localStorage.",
  },
  {
    name: "Ingest",
    ms: 4.8,
    title: "Answered before it matters.",
    body: "Validate, rate-limit, enqueue, return 204. The blue sparks are those replies. It's the only part of the trip a visitor waits on.",
  },
  {
    name: "Queue",
    ms: 5.4,
    title: "The queue takes the spike.",
    body: "When a launch hits, events pile up in Redis instead of in the database, so nothing upstream slows down.",
  },
  {
    name: "Worker",
    ms: 620,
    title: "A worker does the slow part.",
    body: "It parses the user agent, looks up the country and drops the IP, then writes events 100 at a time.",
  },
  {
    name: "Database",
    ms: 660,
    title: "Rollups keep themselves current.",
    body: "Each batch lands in TimescaleDB, and hourly rollups update in the background so charts add up hundreds of rows, not millions.",
  },
  {
    name: "Dashboard",
    ms: 900,
    title: "And it's on the chart.",
    body: "The realtime count ticks over an open connection. The whole trip took under a second.",
  },
];

// Where each stop begins, as scroll progress through the section.
const STARTS = [0, 0.14, 0.32, 0.52, 0.7, 0.86];
const LAST = STOPS.length - 1;

const LABELS: { key: LabelKey; text: string; sub: string; from: number }[] = [
  { key: "sites", text: "Your websites", sub: "pulse.js", from: 0 },
  { key: "ingest", text: "Ingest", sub: "204 · 4.8 ms", from: 1 },
  { key: "queue", text: "Queue", sub: "BullMQ · Redis", from: 2 },
  { key: "worker", text: "Worker", sub: "batches of 100", from: 3 },
  {
    key: "chart",
    text: "TimescaleDB → Dashboard",
    sub: "hourly rollups",
    from: 4,
  },
];

const clamp = (v: number) => Math.min(1, Math.max(0, v));

function stopAt(p: number) {
  let i = 0;
  while (i < LAST && p >= STARTS[i + 1]) i++;
  return i;
}

function clockAt(p: number) {
  const i = stopAt(p);
  if (i === LAST) return STOPS[LAST].ms;
  const local = clamp((p - STARTS[i]) / (STARTS[i + 1] - STARTS[i]));
  return STOPS[i].ms + (STOPS[i + 1].ms - STOPS[i].ms) * local;
}

function formatMs(ms: number) {
  return ms < 100 ? `${ms.toFixed(1)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

type Scene = {
  setProgress: (p: number) => void;
  resize: () => void;
  start: () => void;
  stop: () => void;
  dispose: () => void;
};

export function RoundTrip() {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const labels = useRef<Partial<Record<LabelKey, HTMLDivElement | null>>>({});
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = section.current;
    const cv = canvas.current;
    if (!root || !cv) return;
    let scene: Scene | null = null;
    let cancelled = false;
    let visible = false;
    let raf = 0;

    const progress = () => {
      if (reduced) return 1;
      const r = root.getBoundingClientRect();
      const run = root.offsetHeight - window.innerHeight;
      return run > 0 ? clamp(-r.top / run) : 1;
    };
    const update = () => {
      raf = 0;
      const p = progress();
      setActive(stopAt(p));
      if (clock.current) clock.current.textContent = formatMs(clockAt(p));
      scene?.setProgress(p);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      scene?.resize();
      onScroll();
    };

    const onLabels = (pos: Record<LabelKey, LabelPos>) => {
      for (const k of Object.keys(pos) as LabelKey[]) {
        const el = labels.current[k];
        if (!el) continue;
        const { x, y, visible: on } = pos[k];
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        el.dataset.on = String(on);
      }
    };

    // Load three.js only when the section is close.
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || scene || cancelled) return;
        near.disconnect();
        import("./round-trip-scene")
          .then(({ createRoundTripScene }) => {
            if (cancelled) return;
            scene = createRoundTripScene(cv, {
              mobile: window.innerWidth < 768,
              reduced,
              onLabels,
            });
            setReady(true);
            update();
            if (visible || reduced) scene.start();
          })
          .catch(() => setFailed(true));
      },
      { rootMargin: "800px 0px" }
    );
    near.observe(root);

    // Render only while the section is on screen.
    const onScreen = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) scene?.start();
      else scene?.stop();
    });
    onScreen.observe(root);

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      near.disconnect();
      onScreen.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      scene?.dispose();
    };
  }, [reduced]);

  const stop = STOPS[active];

  return (
    <section
      ref={section}
      id="round-trip"
      aria-labelledby="round-trip-title"
      className={cn("relative", reduced || failed ? "" : "h-[420vh]")}
    >
      <div
        className={cn(
          "relative overflow-hidden",
          reduced || failed ? "" : "sticky top-0 h-svh min-h-[600px]"
        )}
      >
        {!failed && (
          <canvas
            ref={canvas}
            aria-hidden
            className={cn(
              "absolute inset-0 size-full transition-opacity duration-1000",
              ready ? "opacity-100" : "opacity-0",
              (reduced || failed) && "relative h-[70vh]"
            )}
          />
        )}

        {/* Labels that follow the scene. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {LABELS.map((l) => (
            <div
              key={l.key}
              ref={(el) => {
                labels.current[l.key] = el;
              }}
              data-on="false"
              className={cn(
                "pa-scene-label absolute top-0 left-0",
                active >= l.from ? "pa-scene-label-lit" : ""
              )}
            >
              <div className="-translate-x-1/2 -translate-y-full pb-2 text-center whitespace-nowrap">
                <div className="text-[12px] font-medium text-ink sm:text-[13px]">
                  {l.text}
                </div>
                <div className="hidden font-mono text-[10.5px] text-ink/45 sm:block">
                  {l.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-linear-to-b from-charcoal via-charcoal/70 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-linear-to-t from-charcoal via-charcoal/80 to-transparent"
        />

        <div
          className={cn(
            "relative mx-auto flex max-w-6xl flex-col justify-between px-6",
            reduced || failed ? "py-24" : "h-full pt-24 pb-10 md:pt-28"
          )}
        >
          <div>
            <div className="mb-5 flex items-center gap-2">
              <Hash
                aria-hidden
                size={14}
                strokeWidth={2}
                className="shrink-0 text-tangerine"
              />
              <span className="text-[13.5px] font-medium text-ink/80">
                The round trip
              </span>
            </div>
            <h2
              id="round-trip-title"
              className="max-w-xl font-display text-[34px] leading-[1.02] font-semibold tracking-[-0.035em] text-balance text-ink sm:text-[48px]"
            >
              From a click to a chart.{" "}
              <span className="text-ink/35">In under a second.</span>
            </h2>
          </div>

          {reduced || failed ? (
            <ol className="mt-12 grid gap-6 sm:grid-cols-2">
              {STOPS.map((s) => (
                <li key={s.name}>
                  <p className="font-display text-[20px] font-semibold text-ink">
                    {s.title}
                  </p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink/60">
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="grid max-w-md [&>*]:col-start-1 [&>*]:row-start-1">
                {STOPS.map((s, i) => (
                  <div
                    key={s.name}
                    aria-hidden={i !== active}
                    className={cn(
                      "self-end transition-[opacity,translate,filter] duration-500 ease-out",
                      i === active
                        ? "translate-y-0 opacity-100"
                        : cn(
                            "pointer-events-none opacity-0 blur-[2px]",
                            i < active ? "-translate-y-3" : "translate-y-3"
                          )
                    )}
                  >
                    <p className="font-mono text-[11px] tracking-[0.08em] text-tangerine-soft uppercase">
                      {String(i + 1).padStart(2, "0")} / 06 · {s.name}
                    </p>
                    <p className="mt-2 font-display text-[24px] leading-tight font-semibold tracking-display text-balance text-ink sm:text-[28px]">
                      {s.title}
                    </p>
                    <p className="mt-2 text-[15px] leading-relaxed text-pretty text-ink/60">
                      {s.body}
                    </p>
                  </div>
                ))}
              </div>
              <div className="md:text-right">
                <p className="text-[12.5px] text-ink/45">Since the click</p>
                <p className="mt-1 font-display text-[48px] leading-none font-semibold tracking-[-0.04em] text-tangerine-soft tabular-nums sm:text-[64px]">
                  <span ref={clock}>0.0 ms</span>
                </p>
              </div>
            </div>
          )}
          <span className="sr-only" aria-live="polite">
            {stop.title}
          </span>
        </div>
      </div>
    </section>
  );
}
