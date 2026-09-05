"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ACCENT, ACCENT_SOFT, LOGO_FONT } from "./tokens";
import { PulseLogo } from "./shared";

const LINKS = [
  { label: "Stack", href: "#stack" },
  { label: "Architecture", href: "#how-it-works" },
  { label: "Metrics", href: "#features" },
  { label: "The story", href: "#story" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const shell = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 16);
      setOpen((o) => (o ? false : o));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!shell.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  /* Scroll-spy: the section whose top sits nearest under the nav wins.
     rootMargin pulls the viewport in so a section counts as "current"
     only once it owns the middle band of the screen. */
  useEffect(() => {
    const sections = LINKS.map(({ href }) =>
      document.querySelector(href)
    ).filter((n): n is Element => n !== null);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={shell}
      className={`fixed inset-x-0 z-50 flex flex-col items-center transition-[top] duration-300 ease-[var(--ease-out)] ${
        scrolled ? "top-3" : "top-5"
      }`}
    >
      <nav
        className={`flex items-center gap-1 rounded-full transition-[padding,background-color,border-color,box-shadow] duration-300 ease-[var(--ease-out)] ${
          scrolled
            ? "border-ink/10 bg-[oklch(0.235_0_0_/_0.72)] py-1.5 pr-1.5 pl-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]"
            : "border-ink/8 bg-[oklch(0.26_0_0_/_0.5)] py-2 pr-2 pl-4"
        } border backdrop-blur-xl`}
        style={{
          boxShadow: scrolled
            ? "0 1px 0 0 rgba(229,227,210,0.06) inset, 0 12px 40px -12px rgba(0,0,0,0.7)"
            : "0 1px 0 0 rgba(229,227,210,0.05) inset",
        }}
      >
        <Link
          href="/"
          className="group flex items-center gap-2 pr-2"
          aria-label="Pulse home"
        >
          <PulseLogo size={24} />
          <span className="text-[15px] text-ink" style={LOGO_FONT}>
            Pulse
          </span>
        </Link>

        <span className="mx-1 hidden h-5 w-px bg-ink/10 md:block" />

        <div className="hidden items-center gap-0.5 md:flex">
          {LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              aria-current={active === href ? "true" : undefined}
              className={`relative rounded-full px-3 py-1.5 text-[13px] transition-colors duration-150 ease-[var(--ease-out)] hover:bg-ink/[0.06] hover:text-ink ${
                active === href ? "text-ink" : "text-ink/60"
              }`}
            >
              {label}
              <span
                aria-hidden
                className={`absolute inset-x-3 -bottom-0.5 h-px origin-center transition-transform duration-300 ease-[var(--ease-out)] ${
                  active === href ? "scale-x-100" : "scale-x-0"
                }`}
                style={{ background: ACCENT }}
              />
            </a>
          ))}
        </div>

        <span className="mx-1 hidden h-5 w-px bg-ink/10 md:block" />

        <Link
          href="/docs"
          className="hidden rounded-full px-3 py-1.5 text-[13px] text-ink/60 transition-colors duration-150 ease-[var(--ease-out)] hover:bg-ink/[0.06] hover:text-ink md:inline-block"
        >
          Docs
        </Link>

        <Link
          href="/login"
          className="hidden rounded-full px-3 py-1.5 text-[13px] text-ink/60 transition-colors duration-150 ease-[var(--ease-out)] hover:text-ink sm:inline-block"
        >
          Sign in
        </Link>

        <Link
          href="/register"
          className="pa-btn group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium text-charcoal"
          style={{
            background: `linear-gradient(180deg, ${ACCENT_SOFT}, ${ACCENT})`,
            boxShadow:
              "0 1px 0 0 rgba(229,227,210,0.35) inset, 0 6px 18px -8px var(--pa-accent-glow)",
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
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="nav-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="mr-0.5 ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-ink/70 transition-colors duration-150 ease-[var(--ease-out)] hover:bg-ink/[0.06] hover:text-ink md:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 8h16M4 16h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile sheet. Mounted on open so the entrance actually plays,
          and wide enough that the targets are thumb-sized rather than
          pointer-sized. Sign in stays on the wider pill only. */}
      {open && (
        <div
          id="nav-menu"
          className="pa-sheet mt-2.5 w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl border border-ink/10 bg-[oklch(0.235_0_0_/_0.92)] p-1.5 backdrop-blur-xl md:hidden"
          style={{
            boxShadow:
              "0 1px 0 0 rgba(229,227,210,0.06) inset, 0 24px 60px -24px rgba(0,0,0,0.85)",
          }}
        >
          {LINKS.map(({ label, href }) => {
            const on = active === href;
            return (
              <a
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={on ? "true" : undefined}
                className={`relative flex items-center justify-between rounded-xl px-4 py-3.5 text-[15px] transition-colors duration-150 ease-[var(--ease-out)] active:bg-ink/[0.07] ${
                  on ? "bg-ink/[0.05] text-ink" : "text-ink/70"
                }`}
              >
                {on && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 left-1.5 h-4 w-[2px] -translate-y-1/2 rounded-full"
                    style={{ background: ACCENT }}
                  />
                )}
                {label}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="text-ink/25"
                  aria-hidden
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </a>
            );
          })}

          <div className="my-1.5 h-px bg-ink/8" />

          <Link
            href="/docs"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between rounded-xl px-4 py-3.5 text-[15px] text-ink/70 transition-colors duration-150 ease-[var(--ease-out)] active:bg-ink/[0.07]"
          >
            Documentation
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ink/25" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>

          <a
            href="https://github.com/akdevv/pulse-analytics"
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-4 py-3.5 text-[15px] text-ink/70 transition-colors duration-150 ease-[var(--ease-out)] active:bg-ink/[0.07]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-ink/45" aria-hidden>
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
            </svg>
            Source on GitHub
          </a>
        </div>
      )}
    </div>
  );
}
