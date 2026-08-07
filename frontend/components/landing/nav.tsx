"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ACCENT, ACCENT_SOFT, LOGO_FONT, PulseLogo } from "./shared";

const LINKS = [
  { label: "Stack", href: "#stack" },
  { label: "Architecture", href: "#how-it-works" },
  { label: "Metrics", href: "#features" },
  { label: "The story", href: "#story" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 z-50 flex justify-center transition-[top] duration-300 ease-[var(--ease-out)] ${
        scrolled ? "top-3" : "top-5"
      }`}
    >
      <nav
        className={`flex items-center gap-1 rounded-full transition-[padding,background-color,border-color,box-shadow] duration-300 ease-[var(--ease-out)] ${
          scrolled
            ? "pl-3 pr-1.5 py-1.5 border-white/10 bg-[oklch(0.165_0.004_285_/_0.72)] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]"
            : "pl-4 pr-2 py-2 border-white/8 bg-[oklch(0.18_0.005_285_/_0.5)]"
        } border backdrop-blur-xl`}
        style={{
          boxShadow: scrolled
            ? "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 12px 40px -12px rgba(0,0,0,0.7)"
            : "0 1px 0 0 rgba(255,255,255,0.05) inset",
        }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 pr-2 group"
          aria-label="Pulse home"
        >
          <PulseLogo size={24} />
          <span className="text-[15px] text-white" style={LOGO_FONT}>
            Pulse
          </span>
        </Link>

        <span className="mx-1 hidden h-5 w-px bg-white/10 md:block" />

        <div className="hidden items-center gap-0.5 md:flex">
          {LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="relative rounded-full px-3 py-1.5 text-[13px] text-white/60 transition-colors duration-150 ease-[var(--ease-out)] hover:bg-white/[0.06] hover:text-white"
            >
              {label}
            </a>
          ))}
        </div>

        <span className="mx-1 hidden h-5 w-px bg-white/10 md:block" />

        <Link
          href="/login"
          className="hidden rounded-full px-3 py-1.5 text-[13px] text-white/60 transition-colors duration-150 ease-[var(--ease-out)] hover:text-white sm:inline-block"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="pa-btn group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium text-black"
          style={{
            background: `linear-gradient(180deg, ${ACCENT_SOFT}, ${ACCENT})`,
            boxShadow:
              "0 1px 0 0 rgba(255,255,255,0.35) inset, 0 6px 18px -8px var(--pa-accent-glow)",
          }}
        >
          Try it out
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="relative z-10 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </nav>
    </div>
  );
}
