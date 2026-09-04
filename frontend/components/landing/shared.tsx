"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ACCENT, ACCENT_SOFT, DISPLAY } from "./tokens";

/* ── Reveal — scroll-in with stagger. Reduced motion is handled in
   the stylesheet, which collapses the transition for everyone. ── */
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
      className={`pa-btn group inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium text-charcoal ${className}`}
      style={{
        background: `linear-gradient(180deg, ${ACCENT_SOFT}, ${ACCENT})`,
        boxShadow:
          "0 1px 0 0 rgba(229,227,210,0.35) inset, 0 8px 24px -8px var(--pa-accent-glow)",
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
      className={`group inline-flex items-center gap-2 rounded-full border border-ink/12 bg-ink/[0.02] px-6 py-3 text-[14px] text-ink/75 transition-[color,border-color,background-color,transform] duration-150 ease-[var(--ease-out)] hover:border-ink/25 hover:bg-ink/[0.04] hover:text-ink active:scale-[0.97] ${className}`}
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
      className="relative flex shrink-0 items-center justify-center rounded-[9px]"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(180deg, ${ACCENT_SOFT}, ${ACCENT})`,
        boxShadow:
          "0 1px 0 0 rgba(229,227,210,0.4) inset, 0 6px 16px -6px var(--pa-accent-glow)",
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
          stroke="oklch(0.2002 0 0)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="6" r="1.6" fill="oklch(0.2002 0 0)" />
      </svg>
    </div>
  );
}

/* ── Section primitives ────────────────────────────────────── */
export function SectionHeading({
  line1,
  line2,
}: {
  line1: string;
  line2?: string;
}) {
  return (
    <h2
      className="max-w-3xl text-[40px] leading-[0.96] tracking-[-0.03em] text-ink sm:text-[52px] md:text-[68px]"
      style={{ ...DISPLAY, fontWeight: 600 }}
    >
      {line1}
      {line2 && (
        <>
          <br />
          <span className="text-ink/55">{line2}</span>
        </>
      )}
    </h2>
  );
}
