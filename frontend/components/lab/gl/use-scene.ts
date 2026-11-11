"use client";

import { useEffect, useRef, useState } from "react";
import type { SceneHandle } from "./common";

// Loads a three.js scene module when the canvas nears the viewport, runs it
// only while visible, keeps it sized to its box, and disposes it on unmount.
export function useScene<T extends SceneHandle>(
  load: (canvas: HTMLCanvasElement) => Promise<T>
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const handle = useRef<T | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const loader = useRef(load);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    let cancelled = false;
    let visible = false;
    let raf = 0;
    let last = performance.now();
    const t0 = performance.now();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      handle.current?.frame(reduced ? 0 : dt, (now - t0) / 1000);
      if (visible && !reduced) raf = requestAnimationFrame(tick);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const ro = new ResizeObserver(() => {
      handle.current?.resize(cv.clientWidth, cv.clientHeight);
      if (reduced) start();
    });
    ro.observe(cv);

    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || handle.current || cancelled) return;
        near.disconnect();
        loader
          .current(cv)
          .then((h) => {
            if (cancelled) return h.dispose();
            handle.current = h;
            h.resize(cv.clientWidth, cv.clientHeight);
            setReady(true);
            if (visible || reduced) start();
          })
          .catch(() => setFailed(true));
      },
      { rootMargin: "600px 0px" }
    );
    near.observe(cv);

    const onScreen = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && handle.current) start();
      else cancelAnimationFrame(raf);
    });
    onScreen.observe(cv);

    return () => {
      cancelled = true;
      ro.disconnect();
      near.disconnect();
      onScreen.disconnect();
      cancelAnimationFrame(raf);
      handle.current?.dispose();
      handle.current = null;
    };
  }, []);

  return { canvas, handle, ready, failed };
}
