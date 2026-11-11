"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/components/landing/motion";
import { Button } from "../kit";
import type { Labels, SceneHandle } from "./common";
import { useScene } from "./use-scene";

export type StageHandle = SceneHandle & {
  spike?: () => void;
  stats?: () => Record<string, number>;
};

export type StageStep = {
  // Label key to highlight, or null for an overview shot.
  focus: string | null;
  title: string;
  body: string;
};

const clamp = (v: number) => Math.min(1, Math.max(0, v));

// Each step holds still for most of its scroll, then the camera glides on.
function shotFor(p: number, n: number) {
  const x = p * n;
  const i = Math.min(n - 1, Math.floor(x));
  if (i === n - 1) return i;
  return i + clamp((x - i - 0.6) / 0.4);
}

// A pinned WebGL scene that scroll drives through a sequence of shots.
export function Stage<T extends StageHandle>({
  load,
  labels,
  steps,
  ariaLabel,
  spikeOn,
  stats,
  labelsBelow,
}: {
  load: (cv: HTMLCanvasElement, onLabels: (l: Labels) => void) => Promise<T>;
  labels: { key: string; name: string; sub: string }[];
  steps: StageStep[];
  ariaLabel: string;
  // Step that launches a traffic spike when scrolled into.
  spikeOn?: number;
  stats?: (s: Record<string, number>) => ReactNode;
  // Hang labels under their anchor points instead of above.
  labelsBelow?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const tags = useRef<Record<string, HTMLDivElement | null>>({});
  const focus = useRef<string | null>(null);
  const [active, setActive] = useState(0);
  const [values, setValues] = useState<Record<string, number>>({});
  const reduced = useReducedMotion();

  const onLabels = (l: Labels) => {
    for (const [k, v] of Object.entries(l)) {
      const el = tags.current[k];
      if (!el) continue;
      el.style.transform = `translate(${v.x.toFixed(1)}px, ${v.y.toFixed(1)}px)`;
      el.dataset.on = String(v.on);
      el.dataset.focus = String(
        focus.current === null ? "all" : focus.current === k
      );
    }
  };
  const { canvas, handle, ready, failed } = useScene<T>((cv) =>
    load(cv, onLabels)
  );

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let raf = 0;
    let last = -1;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const run = el.offsetHeight - window.innerHeight;
      const p = reduced || run <= 0 ? 1 : clamp(-r.top / run);
      const s = shotFor(p, steps.length);
      const i = Math.round(s);
      handle.current?.setShot?.(s);
      focus.current = steps[i].focus;
      if (i !== last) {
        if (i === spikeOn && last < i) handle.current?.spike?.();
        last = i;
        setActive(i);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    // The scene loads lazily, so give it its shot once it exists.
    const poll = setInterval(() => {
      update();
      if (handle.current?.stats) setValues(handle.current.stats());
    }, 250);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(poll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [handle, steps, spikeOn, reduced]);

  const jump = (i: number) => {
    const el = root.current;
    if (!el) return;
    const run = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: top + ((i + 0.3) / steps.length) * run,
      behavior: "smooth",
    });
  };

  const step = steps[active];

  return (
    <div
      ref={root}
      className="relative"
      style={{ height: reduced ? undefined : `${steps.length * 75 + 60}vh` }}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-ink/8 bg-charcoal",
          reduced ? "aspect-[16/10]" : "sticky top-16 h-[calc(100svh-5rem)]"
        )}
      >
        <canvas
          ref={canvas}
          className={cn(
            "absolute inset-0 size-full transition-opacity duration-700",
            ready ? "opacity-100" : "opacity-0"
          )}
          aria-label={ariaLabel}
        />

        <div aria-hidden className="pointer-events-none absolute inset-0">
          {labels.map((l) => (
            <div
              key={l.key}
              ref={(el) => {
                tags.current[l.key] = el;
              }}
              data-on="false"
              data-focus="all"
              className="pa-stage-tag absolute top-0 left-0"
            >
              <div
                className={cn(
                  "-translate-x-1/2 text-center whitespace-nowrap",
                  labelsBelow ? "pt-1" : "-translate-y-full pb-2"
                )}
              >
                <div className="text-[12px] font-medium text-ink sm:text-[13px]">
                  {l.name}
                </div>
                <div className="pa-stage-sub font-mono text-[10.5px] text-ink/50">
                  {l.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        {failed && (
          <p className="absolute inset-0 grid place-items-center text-[14px] text-ink/50">
            WebGL isn&apos;t available in this browser.
          </p>
        )}

        {/* Step caption, stepper and live numbers. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-linear-to-t from-charcoal via-charcoal/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div key={active} className="pa-stage-caption max-w-md">
              <p className="font-mono text-[11px] tracking-[0.08em] text-tangerine-soft uppercase">
                {String(active + 1).padStart(2, "0")} /{" "}
                {String(steps.length).padStart(2, "0")}
              </p>
              <h3 className="mt-1.5 font-display text-[20px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[24px]">
                {step.title}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink/65 sm:text-[14.5px]">
                {step.body}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              {stats && <div className="hidden sm:block">{stats(values)}</div>}
              {handle.current?.spike && (
                <Button onClick={() => handle.current?.spike?.()}>
                  <Zap size={13} /> Launch a spike
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => jump(i)}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
                className="group flex-1 py-2"
              >
                <span
                  className={cn(
                    "block h-[3px] rounded-full transition-colors",
                    i < active
                      ? "bg-tangerine/70"
                      : i === active
                        ? "bg-tangerine"
                        : "bg-ink/12 group-hover:bg-ink/25"
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
