"use client";

import Link from "next/link";
import { ArrowRight, Check, Copy, Hash } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { siGithub } from "simple-icons";
import { cn } from "@/lib/utils";
import { useMagnetic } from "./motion";

export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
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
      { threshold: 0, rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-shown={shown}
      className={cn("pa-reveal", className)}
      style={{ "--pa-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

export function PrimaryButton({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const magnetic = useMagnetic<HTMLAnchorElement>(0.18);
  return (
    <Link
      href={href}
      {...magnetic}
      className={cn(
        "pa-btn pa-magnet group inline-flex items-center gap-2 rounded-full bg-linear-to-b from-tangerine-soft to-tangerine px-6 py-3 text-[14px] font-medium text-charcoal shadow-glow",
        className
      )}
    >
      {children}
      <ArrowRight
        aria-hidden
        size={14}
        strokeWidth={2.5}
        className="relative z-10 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
      />
    </Link>
  );
}

export function GhostButton({
  href,
  children,
  className,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
}) {
  const magnetic = useMagnetic<HTMLAnchorElement>(0.12);
  return (
    <Link
      href={href}
      {...(external && { target: "_blank", rel: "noreferrer" })}
      {...magnetic}
      className={cn(
        "pa-magnet inline-flex items-center gap-2 rounded-full border border-ink/12 bg-ink/2 px-6 py-3 text-[14px] text-ink/75 transition-[color,border-color,background-color,transform] duration-150 ease-out hover:border-ink/25 hover:bg-ink/4 hover:text-ink active:scale-[0.97]",
        className
      )}
    >
      {children}
    </Link>
  );
}

// Same mark as app/icon.svg; keep the two in sync.
export function PulseLogo({ size = 28 }: { size?: number }) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      className="shrink-0 drop-shadow-[0_6px_16px_var(--pa-accent-glow)]"
    >
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-tangerine-soft)" />
          <stop offset="1" stopColor="var(--color-tangerine)" />
        </linearGradient>
        <clipPath id={`${id}c`}>
          <rect width="32" height="32" rx="10.3" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect width="32" height="32" fill="var(--color-ink)" fillOpacity=".4" />
        <rect y="1" width="32" height="32" fill={`url(#${id}f)`} />
      </g>
      <g
        transform="translate(6.72 6.72) scale(1.16)"
        fill="var(--color-charcoal)"
      >
        <path
          d="M2 12 L5 7 L8 9 L11 4 L14 6"
          fill="none"
          stroke="var(--color-charcoal)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="6" r="1.6" />
      </g>
    </svg>
  );
}

export function SectionHeading({
  label,
  title,
  muted,
  lead,
}: {
  label: string;
  title: string;
  muted?: string;
  lead?: React.ReactNode;
}) {
  return (
    <header className="mb-16 md:mb-24">
      <div className="mb-7 flex items-center gap-2">
        <Hash
          aria-hidden
          size={14}
          strokeWidth={2}
          className="shrink-0 text-tangerine"
        />
        <span className="text-[13.5px] font-medium text-ink/80">{label}</span>
        <span aria-hidden className="pa-rule ml-3 h-px flex-1 bg-ink/10" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-baseline-last lg:gap-14">
        <h2 className="pa-scrub font-display text-[38px] leading-[1.02] font-semibold tracking-[-0.035em] text-balance text-ink sm:text-[48px] lg:text-[58px]">
          <ScrubWords text={title} />
          {muted && (
            <span className="block text-ink/35">
              <ScrubWords text={muted} offset={title.split(" ").length} />
            </span>
          )}
        </h2>
        {lead && (
          <p className="max-w-md text-[15.5px] leading-relaxed text-pretty text-ink/60">
            {lead}
          </p>
        )}
      </div>
    </header>
  );
}

export function GitHubIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d={siGithub.path} />
    </svg>
  );
}

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className="inline-flex max-w-full items-center rounded-xl border border-ink/10 bg-charcoal/60 p-1 pl-4 shadow-edge backdrop-blur-sm">
      <code className="truncate font-mono text-[12.5px] text-ink/80 sm:text-[13px]">
        {command}
      </code>
      <span aria-hidden className="mx-3 h-5 w-px shrink-0 bg-ink/10" />
      <button
        type="button"
        onClick={() =>
          navigator.clipboard?.writeText(command).then(() => setCopied(true))
        }
        aria-label={copied ? "Copied" : `Copy "${command}"`}
        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-ink/55 transition-colors duration-150 ease-out hover:bg-ink/7 hover:text-ink"
      >
        {copied ? (
          <Check aria-hidden size={15} className="text-powder" />
        ) : (
          <Copy aria-hidden size={15} />
        )}
      </button>
    </div>
  );
}

// Words brighten one after another as the heading scrolls up the page.
export function ScrubWords({
  text,
  offset = 0,
}: {
  text: string;
  offset?: number;
}) {
  return text.split(" ").map((word, i, all) => (
    <span key={i}>
      <span
        className="pa-scrub-word"
        style={{ "--i": offset + i } as React.CSSProperties}
      >
        {word}
      </span>
      {i < all.length - 1 && " "}
    </span>
  ));
}
