"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

// Flips to true the first time the element scrolls into view.
export function useInView<T extends Element>(rootMargin = "0px 0px -60px 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);
  return [ref, inView] as const;
}

// Runs `fn` every `ms` while the element is on screen and motion is allowed.
export function useTicker<T extends Element>(fn: () => void, ms: number) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  const cb = useRef(fn);
  useEffect(() => {
    cb.current = fn;
  });
  useEffect(() => {
    const node = ref.current;
    if (!node || reduced) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      clearInterval(id);
      if (entry.isIntersecting) id = setInterval(() => cb.current(), ms);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      clearInterval(id);
    };
  }, [ms, reduced]);
  return ref;
}

export function CountUp({
  to,
  duration = 1400,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  className,
}: {
  to: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView || reduced) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(to * (1 - (1 - t) ** 4));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, to, duration]);

  return (
    <span ref={ref} className={className}>
      {format(reduced && inView ? to : value)}
    </span>
  );
}

// A card whose border and surface light up under the pointer.
export function Spotlight({
  children,
  className,
  tilt = false,
}: {
  children: React.ReactNode;
  className?: string;
  tilt?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const node = ref.current;
    if (!node || e.pointerType !== "mouse") return;
    const r = node.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    node.style.setProperty("--mx", `${x}px`);
    node.style.setProperty("--my", `${y}px`);
    if (tilt) {
      node.style.setProperty("--ry", `${(x / r.width - 0.5) * 5}deg`);
      node.style.setProperty("--rx", `${(0.5 - y / r.height) * 5}deg`);
    }
  };
  const onLeave = () => {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  };
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      data-tilt={tilt || undefined}
      className={cn("pa-spot", className)}
    >
      {children}
    </div>
  );
}

// Pulls an element a few pixels toward the cursor.
export function useMagnetic<T extends HTMLElement>(strength = 0.25) {
  const ref = useRef<T>(null);
  const onPointerMove = (e: React.PointerEvent) => {
    const node = ref.current;
    if (!node || e.pointerType !== "mouse") return;
    const r = node.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) * strength;
    const dy = (e.clientY - (r.top + r.height / 2)) * strength;
    node.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
  };
  const onPointerLeave = () => {
    if (ref.current) ref.current.style.translate = "";
  };
  return { ref, onPointerMove, onPointerLeave };
}

// Tilts its child back in 3D and flattens it as it scrolls toward the middle.
export function ScrollTilt({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || reduced) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = node.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the top sits at the viewport bottom, 1 once it reaches 25%.
      const t = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)));
      node.style.setProperty("--tilt", `${(1 - t) * 22}deg`);
      node.style.setProperty("--tilt-scale", `${0.92 + t * 0.08}`);
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

  return (
    <div className="[perspective:1600px]">
      <div ref={ref} className="pa-tilt">
        {children}
      </div>
    </div>
  );
}
