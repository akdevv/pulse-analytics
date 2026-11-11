"use client";

import { useEffect, useRef, useState } from "react";
import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "./motion";
import type { LabelKey, LabelPos } from "./round-trip-scene";

type Legend = "event" | "reply" | "batch";

type Step = {
  name: string;
  anchor: LabelKey;
  legend: Legend;
  ms: number;
  title: string;
  body: string;
};

// Timings are illustrative except ingest, the measured p90. The rest follow
// the worker's 1 s flush interval.
const STEPS: Step[] = [
  {
    name: "Browser",
    anchor: "sites",
    legend: "event",
    ms: 0,
    title: "Your site sends an event.",
    body: "Every orange dot is one pageview leaving a visitor's browser. The 3 KB script sends the path, referrer and screen size, and sets no cookies.",
  },
  {
    name: "Ingest",
    anchor: "ingest",
    legend: "reply",
    ms: 4.8,
    title: "Pulse answers right away.",
    body: "The ring is the ingest API. It checks the event, puts it in a queue and replies 204. The blue sparks are those replies: the visitor is done after 4.8 ms.",
  },
  {
    name: "Queue",
    anchor: "queue",
    legend: "event",
    ms: 5.4,
    title: "Events wait in a queue.",
    body: "The spiral is a Redis queue. When a traffic spike hits, the queue fills up instead of flooding the database.",
  },
  {
    name: "Worker",
    anchor: "worker",
    legend: "batch",
    ms: 620,
    title: "A worker packs them into batches.",
    body: "It reads the browser, looks up the country and throws the IP away. Each glowing cube is 100 events, written to the database in one go.",
  },
  {
    name: "Database",
    anchor: "chart",
    legend: "batch",
    ms: 660,
    title: "Batches land in the database.",
    body: "TimescaleDB stores each batch and keeps hourly totals up to date, so charts add up hundreds of rows instead of millions.",
  },
  {
    name: "Dashboard",
    anchor: "now",
    legend: "event",
    ms: 900,
    title: "Your dashboard updates.",
    body: "The bright bar is today. Less than a second after the click, the new pageview is on your chart.",
  },
];

const TAGS: Record<LabelKey, string> = {
  sites: "Your websites",
  ingest: "Ingest API",
  queue: "Queue",
  worker: "Worker",
  chart: "Database",
  now: "Today's bar",
};

const LEGEND: { key: Legend; label: string; swatch: string }[] = [
  {
    key: "event",
    label: "One pageview",
    swatch: "size-2 rounded-full bg-tangerine",
  },
  {
    key: "reply",
    label: "204 reply",
    swatch: "size-2 rounded-full bg-powder",
  },
  {
    key: "batch",
    label: "Batch of 100",
    swatch: "size-2.5 rounded-[2px] bg-tangerine-soft",
  },
];

// Where each step begins, as scroll progress through the section.
const STARTS = [0, 0.14, 0.32, 0.52, 0.7, 0.86];
const LAST = STEPS.length - 1;

const clamp = (v: number) => Math.min(1, Math.max(0, v));

function stepAt(p: number) {
  let i = 0;
  while (i < LAST && p >= STARTS[i + 1]) i++;
  return i;
}

function localAt(p: number, i: number) {
  const end = i === LAST ? 1 : STARTS[i + 1];
  return clamp((p - STARTS[i]) / (end - STARTS[i]));
}

function clockAt(p: number) {
  const i = stepAt(p);
  if (i === LAST) return STEPS[LAST].ms;
  return STEPS[i].ms + (STEPS[i + 1].ms - STEPS[i].ms) * localAt(p, i);
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
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const tags = useRef<Partial<Record<LabelKey, HTMLDivElement | null>>>({});
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const activeRef = useRef(0);

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
      const i = stepAt(p);
      activeRef.current = i;
      setActive(i);
      if (clock.current) clock.current.textContent = formatMs(clockAt(p));
      fills.current.forEach((el, k) => {
        if (!el) return;
        const f = k < i ? 1 : k === i ? localAt(p, i) : 0;
        el.style.scale = `${f.toFixed(3)} 1`;
      });
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
      const focus = STEPS[activeRef.current].anchor;
      for (const k of Object.keys(pos) as LabelKey[]) {
        const el = tags.current[k];
        if (!el) continue;
        const { x, y, r, visible: on } = pos[k];
        // The focus ring wraps the object; the tag sits just above it.
        const ring = Math.min(Math.max(r + 14, 22), 220);
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        el.style.setProperty("--ring", `${(ring * 2).toFixed(0)}px`);
        el.dataset.on = String(on);
        el.dataset.focus = String(k === focus);
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

  const jumpTo = (i: number) => {
    const root = section.current;
    if (!root) return;
    const run = root.offsetHeight - window.innerHeight;
    const top = root.getBoundingClientRect().top + window.scrollY;
    // Land a little into the step so its scene has settled.
    const p = Math.min(1, STARTS[i] + 0.04);
    window.scrollTo({ top: top + p * run, behavior: "smooth" });
  };

  const step = STEPS[active];
  const flat = reduced || failed;

  return (
    <section
      ref={section}
      id="round-trip"
      aria-labelledby="round-trip-title"
      className={cn("relative", flat ? "" : "h-[460vh]")}
    >
      <div
        className={cn(
          "relative overflow-hidden",
          flat ? "" : "sticky top-0 h-svh min-h-[640px]"
        )}
      >
        {!failed && (
          <canvas
            ref={canvas}
            aria-hidden
            className={cn(
              "absolute inset-0 size-full transition-opacity duration-1000",
              ready ? "opacity-100" : "opacity-0"
            )}
          />
        )}

        {/* Name tags and the focus ring, positioned by the scene. */}
        {!flat && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {(Object.keys(TAGS) as LabelKey[]).map((k) => {
              const n = STEPS.findIndex((s) => s.anchor === k);
              return (
                <div
                  key={k}
                  ref={(el) => {
                    tags.current[k] = el;
                  }}
                  data-on="false"
                  data-focus="false"
                  className="pa-tag absolute top-0 left-0"
                >
                  <span className="pa-tag-ring" />
                  <span className="pa-tag-label">
                    {n >= 0 && <span className="pa-tag-num">{n + 1}</span>}
                    {TAGS[k]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-linear-to-b from-charcoal via-charcoal/70 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[22rem] bg-linear-to-t from-charcoal via-charcoal/85 to-transparent"
        />

        <div
          className={cn(
            "relative mx-auto flex max-w-6xl flex-col justify-between px-5 sm:px-6",
            flat ? "py-24" : "h-full pt-24 pb-8 md:pt-28"
          )}
        >
          <div>
            <div className="mb-4 flex items-center gap-2">
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
              className="max-w-xl font-display text-[28px] leading-[1.02] font-semibold tracking-[-0.035em] text-balance text-ink sm:text-[46px]"
            >
              Follow one pageview{" "}
              <span className="text-ink/35">from click to chart.</span>
            </h2>
          </div>

          {flat ? (
            <ol className="mt-12 grid gap-6 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <li key={s.name}>
                  <p className="font-mono text-[11px] tracking-[0.08em] text-tangerine-soft uppercase">
                    Step {i + 1} · {s.name}
                  </p>
                  <p className="mt-1.5 font-display text-[20px] font-semibold text-ink">
                    {s.title}
                  </p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink/60">
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 items-end gap-5 md:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
                <div className="rounded-2xl border border-ink/10 bg-charcoal/75 p-4 shadow-[0_24px_48px_-24px_rgb(0_0_0/0.8)] backdrop-blur-md sm:p-5">
                  <div className="grid [&>*]:col-start-1 [&>*]:row-start-1">
                    {STEPS.map((s, i) => (
                      <div
                        key={s.name}
                        aria-hidden={i !== active}
                        className={cn(
                          "transition-[opacity,translate] duration-500 ease-out",
                          i === active
                            ? "translate-y-0 opacity-100"
                            : cn(
                                "pointer-events-none opacity-0",
                                i < active ? "-translate-y-2" : "translate-y-2"
                              )
                        )}
                      >
                        <p className="font-mono text-[11px] tracking-[0.08em] text-tangerine-soft uppercase">
                          Step {i + 1} of 6 · {s.name}
                        </p>
                        <p className="mt-2 font-display text-[22px] leading-tight font-semibold tracking-display text-balance text-ink sm:text-[26px]">
                          {s.title}
                        </p>
                        <p className="mt-2 text-[14px] leading-relaxed text-pretty text-ink/65 sm:text-[14.5px]">
                          {s.body}
                        </p>
                      </div>
                    ))}
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-2 border-t border-ink/8 pt-3 sm:mt-4 sm:pt-4">
                    {LEGEND.map((l) => (
                      <li
                        key={l.key}
                        className={cn(
                          "items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] transition-colors duration-300",
                          l.key === step.legend
                            ? "flex border-tangerine/40 bg-tangerine/10 text-ink"
                            : "hidden border-ink/10 text-ink/45 sm:flex"
                        )}
                      >
                        <span aria-hidden className={l.swatch} />
                        {l.label}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-baseline justify-between gap-4 md:block md:text-right">
                  <p className="text-[12.5px] text-ink/50">
                    Time since the visitor clicked
                  </p>
                  <p className="font-display text-[34px] leading-none font-semibold tracking-[-0.04em] text-tangerine-soft tabular-nums sm:text-[60px] md:mt-1">
                    <span ref={clock}>0.0 ms</span>
                  </p>
                  <p className="mt-2 hidden text-[12.5px] text-ink/45 md:block">
                    {active === 0
                      ? "The trip starts when the page loads."
                      : "The visitor only waited 4.8 ms. The rest runs in the background."}
                  </p>
                </div>
              </div>

              <ol
                aria-label="Steps"
                className="grid grid-cols-6 gap-1.5 sm:gap-2"
              >
                {STEPS.map((s, i) => (
                  <li key={s.name}>
                    <button
                      type="button"
                      onClick={() => jumpTo(i)}
                      aria-current={i === active ? "step" : undefined}
                      className="group w-full cursor-pointer pt-2 text-left"
                    >
                      <span className="relative block h-[3px] overflow-hidden rounded-full bg-ink/12">
                        <span
                          ref={(el) => {
                            fills.current[i] = el;
                          }}
                          className="absolute inset-0 origin-left scale-x-0 rounded-full bg-tangerine-soft"
                        />
                      </span>
                      <span
                        className={cn(
                          "mt-2 hidden text-[12px] transition-colors duration-300 sm:block",
                          i === active
                            ? "text-ink"
                            : "text-ink/40 group-hover:text-ink/70"
                        )}
                      >
                        {i + 1}. {s.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <span className="sr-only" aria-live="polite">
            Step {active + 1}: {step.title}
          </span>
        </div>
      </div>
    </section>
  );
}
