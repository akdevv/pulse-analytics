"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const C = {
  hot: "#f26a2e",
  soft: "#f7a26b",
  cool: "#bcd0d4",
  ink: (a: number) => `rgb(229 227 210 / ${a})`,
  well: "#121212",
};

// Runs `frame(dt, now)` every animation frame while the element is on screen.
export function useLoop<T extends Element>(
  frame: (dt: number, now: number) => void,
  running = true
) {
  const ref = useRef<T>(null);
  const cb = useRef(frame);
  useEffect(() => {
    cb.current = frame;
  });
  useEffect(() => {
    const node = ref.current;
    if (!node || !running) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let raf = 0;
    let last = performance.now();
    let visible = false;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      cb.current(reduced ? 0 : dt, now);
      if (visible && !reduced) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    });
    io.observe(node);
    if (reduced) requestAnimationFrame(tick);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [running]);
  return ref;
}

// Sizes a canvas to its box at the device pixel ratio and returns the context.
export function fit(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (
    canvas.width !== Math.round(w * dpr) ||
    canvas.height !== Math.round(h * dpr)
  ) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

export function Button({
  children,
  onClick,
  active,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[12.5px] font-medium transition-colors duration-200",
        active
          ? "border-tangerine/50 bg-tangerine/15 text-ink"
          : "border-ink/12 text-ink/70 hover:border-ink/25 hover:text-ink",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Stat({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "hot" | "cool";
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] text-ink/45">{label}</div>
      <div
        className={cn(
          "mt-1 font-display text-[22px] leading-none font-semibold tracking-[-0.02em] tabular-nums",
          tone === "hot" && "text-tangerine-soft",
          tone === "cool" && "text-powder",
          tone === "ink" && "text-ink"
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function useThrottled<T>(initial: T, ms = 150) {
  const [value, setValue] = useState(initial);
  const last = useRef(0);
  const set = (v: T, now: number) => {
    if (now - last.current < ms) return;
    last.current = now;
    setValue(v);
  };
  return [value, set] as const;
}

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
