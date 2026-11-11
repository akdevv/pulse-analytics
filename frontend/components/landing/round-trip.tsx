"use client";

import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "./motion";
import type { LabelKey, LabelPos } from "./round-trip-scene";

type Step = {
  name: string;
  anchor: LabelKey;
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
    ms: 0,
    title: "A visitor opens your page.",
    body: "Each orange pill is a pageview leaving the browser. The 3 KB script sends the path, referrer and screen size, and sets no cookies.",
  },
  {
    name: "Ingest",
    anchor: "ingest",
    ms: 4.8,
    title: "Pulse answers right away.",
    body: "The gate is the ingest API. It checks the event, drops it in the queue and replies 204. The blue pills flying back are those replies: the visitor is done after 4.8 ms.",
  },
  {
    name: "Queue",
    anchor: "queue",
    ms: 5.4,
    title: "Events wait on the conveyor.",
    body: "The belt is a Redis queue. A launch just hit: watch it fill up and the lights on the rail climb, while the database stays calm.",
  },
  {
    name: "Worker",
    anchor: "worker",
    ms: 620,
    title: "The worker presses batches.",
    body: "It reads the browser, looks up the country and throws the IP away. Each crate holds 100 events, written to the database in one go.",
  },
  {
    name: "Database",
    anchor: "chart",
    ms: 660,
    title: "Crates land in the database.",
    body: "TimescaleDB stores each batch and keeps hourly totals up to date, so charts add up hundreds of rows instead of millions.",
  },
  {
    name: "Dashboard",
    anchor: "now",
    ms: 900,
    title: "Your dashboard updates.",
    body: "The count ticks up and today's bar grows. Less than a second after the click, the pageview is on your chart.",
  },
];

const TAGS: Record<LabelKey, string> = {
  sites: "Visitor's browser",
  ingest: "Ingest API",
  queue: "Queue",
  worker: "Worker",
  chart: "Database",
  now: "Dashboard",
};

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
  spike: () => void;
  start: () => void;
  stop: () => void;
  dispose: () => void;
};

export function RoundTrip() {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const waited = useRef<HTMLSpanElement>(null);
  const heading = useRef<HTMLDivElement>(null);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const tags = useRef<Partial<Record<LabelKey, HTMLDivElement | null>>>({});
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const activeRef = useRef(0);
  const sceneRef = useRef<Scene | null>(null);

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
      // The headline makes way once the camera starts its tour.
      if (heading.current && !reduced) {
        const fade = clamp((p - 0.02) / 0.04);
        heading.current.style.opacity = (1 - fade).toFixed(3);
        heading.current.style.translate = `0 ${(-fade * 12).toFixed(1)}px`;
      }
      const ms = clockAt(p);
      if (clock.current) clock.current.textContent = formatMs(ms);
      if (waited.current)
        waited.current.textContent = formatMs(Math.min(ms, STEPS[1].ms));
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
        el.dataset.on = String(on && k === focus);
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
            sceneRef.current = scene;
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
      sceneRef.current = null;
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

        {/* The name of the station in focus, and a ring around it. */}
        {!flat && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {(Object.keys(TAGS) as LabelKey[]).map((k) => (
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
                <span className="pa-tag-label">{TAGS[k]}</span>
              </div>
            ))}
          </div>
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-charcoal to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-charcoal via-charcoal/70 to-transparent md:h-2/5 md:via-charcoal/30"
        />

        <div
          className={cn(
            "relative mx-auto flex max-w-6xl flex-col justify-between px-5 sm:px-6",
            flat ? "py-24" : "h-full pt-24 pb-8 md:pt-28"
          )}
        >
          <div ref={heading} className="max-w-xl">
            <p className="mb-4 flex items-center gap-2 text-[13px] text-ink/55">
              <span className="size-1.5 rounded-full bg-tangerine" />
              The round trip
            </p>
            <h2
              id="round-trip-title"
              className="font-display text-[36px] leading-[0.98] font-semibold tracking-[-0.04em] text-balance text-ink sm:text-[52px] lg:text-[60px]"
            >
              Follow one pageview{" "}
              <span className="text-ink/35">from click to chart.</span>
            </h2>
          </div>

          {flat ? (
            <ol className="mt-12 grid gap-8 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <li key={s.name}>
                  <p className="font-mono text-[11px] tracking-[0.08em] text-tangerine-soft uppercase">
                    {String(i + 1).padStart(2, "0")} · {s.name}
                  </p>
                  <p className="mt-1.5 font-display text-[22px] leading-tight font-semibold tracking-display text-ink">
                    {s.title}
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-pretty text-ink/60">
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <div>
              <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="relative min-h-[156px] max-w-md">
                  {STEPS.map((s, i) => (
                    <div
                      key={s.name}
                      aria-hidden={i !== active}
                      className={cn(
                        "absolute inset-x-0 bottom-0 transition-[opacity,translate,filter] duration-500 ease-out",
                        i === active
                          ? "translate-y-0 opacity-100"
                          : "pointer-events-none translate-y-3 opacity-0 blur-[3px]"
                      )}
                    >
                      <p className="font-mono text-[11px] tracking-[0.08em] text-tangerine-soft uppercase">
                        {String(i + 1).padStart(2, "0")} / 06 · {s.name}
                      </p>
                      <p className="mt-1.5 font-display text-[24px] leading-tight font-semibold tracking-display text-ink sm:text-[28px]">
                        {s.title}
                      </p>
                      <p className="mt-2 text-[15px] leading-relaxed text-pretty text-ink/60">
                        {s.body}
                      </p>
                      {s.anchor === "queue" && (
                        <button
                          type="button"
                          tabIndex={i === active ? 0 : -1}
                          onClick={() => sceneRef.current?.spike()}
                          className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-[14px] font-medium text-tangerine-soft transition-colors hover:text-ink"
                        >
                          <Zap size={14} /> Send another spike
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <dl className="flex gap-10 md:justify-end md:text-right">
                  <div>
                    <dt className="text-[12.5px] text-ink/45">
                      Since the click
                    </dt>
                    <dd className="mt-1 font-display text-[40px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums sm:text-[48px]">
                      <span ref={clock}>0.0 ms</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12.5px] text-ink/45">
                      Visitor waited
                    </dt>
                    <dd className="mt-1 font-display text-[40px] leading-none font-semibold tracking-[-0.03em] text-ink/70 tabular-nums sm:text-[48px]">
                      <span ref={waited}>0.0 ms</span>
                    </dd>
                  </div>
                </dl>
              </div>

              <ol aria-label="Steps" className="mt-7 grid grid-cols-6 gap-2">
                {STEPS.map((s, i) => (
                  <li key={s.name}>
                    <button
                      type="button"
                      onClick={() => jumpTo(i)}
                      aria-current={i === active ? "step" : undefined}
                      aria-label={`Step ${i + 1}: ${s.name}`}
                      className="group block w-full cursor-pointer py-2 text-left"
                    >
                      <span className="relative block h-px overflow-hidden bg-ink/12">
                        <span
                          ref={(el) => {
                            fills.current[i] = el;
                          }}
                          className="absolute inset-0 origin-left scale-x-0 bg-tangerine-soft"
                        />
                      </span>
                      <span
                        className={cn(
                          "mt-2.5 hidden text-[12px] transition-colors duration-300 md:block",
                          i === active
                            ? "text-ink/80"
                            : "text-ink/30 group-hover:text-ink/60"
                        )}
                      >
                        {s.name}
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
