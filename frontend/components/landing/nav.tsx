"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ACCENT, LOGO_FONT, PulseLogo } from "./shared";

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
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-[padding,background-color,border-color] duration-300 ${
        scrolled
          ? "py-2.5 bg-black/70 backdrop-blur-xl border-b border-white/6"
          : "py-5 border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          aria-label="Pulse home"
        >
          <PulseLogo size={26} />
          <span className="text-[16px] text-white" style={LOGO_FONT}>
            Pulse
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="relative px-3 py-1.5 text-[13px] text-white/55 transition-colors hover:text-white group"
            >
              {label}
              <span
                className="absolute left-3 right-3 -bottom-0.5 h-px origin-left scale-x-0 bg-white/60 transition-transform duration-300 group-hover:scale-x-100"
              />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/login"
            className="hidden sm:inline-block px-3 py-1.5 text-[13px] text-white/60 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium text-black transition-colors"
            style={{ background: ACCENT }}
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
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </nav>
  );
}
