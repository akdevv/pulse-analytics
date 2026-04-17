"use client";

import { useEffect, useRef, useState } from "react";

export const ACCENT = "oklch(0.6429 0.1675 45.988)";
export const ACCENT_SOFT = "oklch(0.78 0.13 55)";
export const SURFACE = "oklch(0.17 0.004 285)";
export const BG = "oklch(0.13 0.004 285)";
export const DISPLAY = {
  fontFamily: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif",
  fontWeight: 500,
  letterSpacing: "-0.02em",
} as const;

export const LOGO_FONT = {
  fontFamily: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif",
  fontWeight: 700,
  letterSpacing: "-0.04em",
} as const;

export function AnimatedCounter({
  end,
  suffix = "",
  duration = 1600,
}: {
  end: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(ease * end));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export function PulseLogo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="rounded-md flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: ACCENT }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path
          d="M2 12 L5 7 L8 9 L11 4 L14 6"
          stroke="oklch(0.13 0.004 285)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="6" r="1.6" fill="oklch(0.13 0.004 285)" />
      </svg>
    </div>
  );
}

export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.24em] text-white/45">
      <span className="h-px w-6 bg-white/25" />
      {children}
    </div>
  );
}

export function SectionHeading({
  line1,
  line2,
}: {
  line1: string;
  line2?: string;
}) {
  return (
    <h2
      className="text-[44px] md:text-[64px] text-white leading-none tracking-[-0.02em] max-w-3xl"
      style={DISPLAY}
    >
      {line1}
      {line2 && (
        <>
          <br />
          <span className="text-white/40">{line2}</span>
        </>
      )}
    </h2>
  );
}
