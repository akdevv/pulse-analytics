"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ── Design tokens ─────────────────────────────────────────── */
export const ACCENT = "oklch(0.6429 0.1675 45.988)";
export const ACCENT_SOFT = "oklch(0.78 0.13 55)";
export const SURFACE_1 = "oklch(0.165 0.004 285)";
export const SURFACE_2 = "oklch(0.185 0.005 285)";
/** @deprecated use SURFACE_1 */
export const SURFACE = SURFACE_1;
export const BG = "oklch(0.145 0.004 285)";

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

/* ── Reveal — scroll-in with stagger, reduced-motion aware ──── */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-shown={shown}
      className={`pa-reveal ${className}`}
      style={{ ...style, ["--pa-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/* ── Buttons ───────────────────────────────────────────────── */
export function PrimaryButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`pa-btn group inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium text-black ${className}`}
      style={{
        background: `linear-gradient(180deg, ${ACCENT_SOFT}, ${ACCENT})`,
        boxShadow:
          "0 1px 0 0 rgba(255,255,255,0.35) inset, 0 8px 24px -8px var(--pa-accent-glow)",
      }}
    >
      {children}
      <Arrow />
    </Link>
  );
}

export function GhostButton({
  href,
  children,
  className = "",
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={`group inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] text-white/75 border border-white/12 bg-white/[0.02] transition-[color,border-color,background-color,transform] duration-150 ease-[var(--ease-out)] hover:text-white hover:border-white/25 hover:bg-white/[0.04] active:scale-[0.97] ${className}`}
    >
      {children}
    </Link>
  );
}

export function Arrow({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="relative z-10 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/* ── Counters ──────────────────────────────────────────────── */
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
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setCount(end);
            return;
          }
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

/* ── Brand mark ────────────────────────────────────────────── */
export function PulseLogo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="relative rounded-[9px] flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(180deg, ${ACCENT_SOFT}, ${ACCENT})`,
        boxShadow:
          "0 1px 0 0 rgba(255,255,255,0.4) inset, 0 6px 16px -6px var(--pa-accent-glow)",
      }}
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path
          d="M2 12 L5 7 L8 9 L11 4 L14 6"
          stroke="oklch(0.145 0.004 285)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="6" r="1.6" fill="oklch(0.145 0.004 285)" />
      </svg>
    </div>
  );
}

/* ── Section primitives ────────────────────────────────────── */
export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.24em] text-white/45">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: ACCENT,
          boxShadow: "0 0 12px 1px var(--pa-accent-glow)",
        }}
      />
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
      className="text-[44px] md:text-[64px] text-white leading-[0.98] tracking-[-0.025em] max-w-3xl"
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
