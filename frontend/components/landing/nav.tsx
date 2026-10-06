"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PrimaryButton, PulseLogo } from "./shared";
import { REPO } from "./site";

const SECTIONS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Install", href: "#install" },
];

const LINKS = [...SECTIONS, { label: "Docs", href: "/docs" }];

const PILL =
  "rounded-full transition-colors duration-150 ease-out hover:bg-ink/6 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tangerine";

const SURFACE =
  "border border-ink/10 bg-charcoal/70 shadow-edge backdrop-blur-xl backdrop-saturate-150";

const BAR =
  "absolute right-2.75 h-[1.75px] rounded-full bg-current transition-[transform,width] duration-300 ease-out";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const shell = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      setOpen(false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!shell.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  useEffect(() => {
    const sections = SECTIONS.map(({ href }) =>
      document.querySelector(href)
    ).filter((n): n is Element => n !== null);
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(`#${e.target.id}`);
          else if (e.target === sections[0] && e.boundingClientRect.top > 0)
            setActive(null);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      ref={shell}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4"
    >
      <nav
        className={cn(
          "mx-auto flex h-13 items-center justify-between gap-1 rounded-full p-1.5 pl-4 transition-shadow duration-300 ease-out md:w-fit md:justify-start",
          SURFACE,
          (scrolled || open) && "shadow-lg shadow-black/40"
        )}
      >
        <Link
          href="/"
          aria-label="Pulse home"
          className="flex items-center gap-2 rounded-full pr-1"
        >
          <PulseLogo size={22} />
          <span className="font-display text-[16px] font-bold tracking-logo text-ink">
            Pulse
          </span>
        </Link>

        <Divider />
        <div className="hidden items-center md:flex">
          {SECTIONS.map(({ label, href }) => (
            <NavLink key={href} href={href} on={active === href}>
              {label}
            </NavLink>
          ))}
        </div>
        <Divider />
        <div className="hidden items-center md:flex">
          <NavLink href="/docs">Docs</NavLink>
          <NavLink href="/login">Sign in</NavLink>
        </div>

        <div className="flex items-center gap-1 md:ml-1">
          <PrimaryButton
            href="/register"
            className="hidden h-10 gap-1.5 px-4 py-0 text-[13.5px] md:inline-flex"
          >
            Get started
          </PrimaryButton>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="nav-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className={cn(PILL, "relative size-10 text-ink/85 md:hidden")}
          >
            <span
              aria-hidden
              className={cn(
                BAR,
                "top-1/2 w-4.5",
                open ? "rotate-45" : "-translate-y-1"
              )}
            />
            <span
              aria-hidden
              className={cn(
                BAR,
                "top-1/2",
                open ? "w-4.5 -rotate-45" : "w-3 translate-y-[3.5px]"
              )}
            />
          </button>
        </div>
      </nav>

      {open && (
        <>
          <div
            aria-hidden
            onClick={() => setOpen(false)}
            className="pa-fade fixed inset-0 -z-10 bg-charcoal/60 backdrop-blur-sm md:hidden"
          />
          <div
            id="nav-menu"
            className="pa-sheet mt-2 rounded-[22px] border border-ink/10 bg-surface-1 p-1.5 shadow-2xl shadow-black/60 md:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active === href ? "location" : undefined}
                  className={cn(
                    "flex h-11 items-center rounded-xl px-3.5 text-[15px] active:bg-ink/6",
                    active === href ? "bg-ink/5 text-ink" : "text-ink/75"
                  )}
                >
                  {label}
                </Link>
              ))}
              <a
                href={REPO}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center gap-2 rounded-xl px-3.5 text-[15px] text-ink/75 active:bg-ink/6"
              >
                GitHub
                <ArrowUpRight aria-hidden size={14} className="text-ink/35" />
              </a>
            </nav>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 border-t border-ink/8 pt-1.5">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center justify-center rounded-xl bg-ink/5 text-[14.5px] font-medium text-ink/85 active:bg-ink/8"
              >
                Sign in
              </Link>
              <PrimaryButton
                href="/register"
                className="h-11 justify-center rounded-xl py-0 text-[14.5px]"
              >
                Get started
              </PrimaryButton>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

function Divider() {
  return (
    <span aria-hidden className="mx-1.5 hidden h-5 w-px bg-ink/10 md:block" />
  );
}

function NavLink({
  href,
  on = false,
  children,
}: {
  href: string;
  on?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={on ? "location" : undefined}
      className={cn(
        PILL,
        "relative px-3 py-2 text-[13.5px]",
        on ? "text-ink" : "text-ink/60"
      )}
    >
      {children}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-3 bottom-1 h-px rounded-full bg-tangerine transition-opacity duration-200 ease-out",
          on ? "opacity-100" : "opacity-0"
        )}
      />
    </Link>
  );
}
