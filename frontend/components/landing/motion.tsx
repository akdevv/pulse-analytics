"use client";

import { useEffect, useRef, useState } from "react";

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

// Tilts its child back in 3D and lets it settle flat as it scrolls up.
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
      // 0 while the top sits low in the viewport, 1 once it reaches 20%.
      const t = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.8)));
      node.style.setProperty("--tilt", `${((1 - t) * 14).toFixed(2)}deg`);
      node.style.setProperty("--tilt-scale", `${(0.95 + t * 0.05).toFixed(4)}`);
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
    <div className="[perspective:1800px]">
      <div ref={ref} className="pa-tilt">
        {children}
      </div>
    </div>
  );
}
