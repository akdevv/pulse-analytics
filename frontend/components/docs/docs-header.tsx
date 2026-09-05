"use client";

import Link from "next/link";
import { useState } from "react";

import { LOGO_FONT } from "@/components/landing/tokens";
import { PulseLogo } from "@/components/landing/shared";
import { DocsNav } from "./docs-nav";

const REPO = "https://github.com/akdevv/pulse-analytics";

export function DocsHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/8 bg-charcoal/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[80rem] items-center gap-2.5 px-5 sm:px-8">
        {/* Product mark, then the section. Told apart by face and weight
            rather than by two opacities of one wordmark. */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity duration-150 ease-[var(--ease-out)] hover:opacity-85"
            aria-label="Pulse home"
          >
            <PulseLogo size={20} />
            <span className="text-[15px] text-ink" style={LOGO_FONT}>
              Pulse
            </span>
          </Link>
          <span aria-hidden className="text-[14px] text-ink/25">
            /
          </span>
          <Link
            href="/docs"
            className="text-[13.5px] tracking-[-0.01em] text-ink/70 transition-colors duration-150 ease-[var(--ease-out)] hover:text-ink"
          >
            Docs
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            aria-label="Source on GitHub"
            className="inline-flex size-8 items-center justify-center rounded-lg text-ink/55 transition-[color,background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-ink/[0.07] hover:text-ink active:scale-95"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
            </svg>
          </a>
          {/* Quiet by design: same ghost family as the icon button next to
              it, with a hairline so it still reads as a control. */}
          <Link
            href="/dashboard"
            className="ml-0.5 rounded-full border border-ink/10 px-3.5 py-1.5 text-[13px] text-ink/75 transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-ink/20 hover:bg-ink/[0.05] hover:text-ink active:scale-[0.97]"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="docs-mobile-nav"
            aria-label={open ? "Close navigation" : "Open navigation"}
            className="ml-0.5 inline-flex size-8 items-center justify-center rounded-full text-ink/60 transition-colors duration-150 ease-[var(--ease-out)] hover:bg-ink/[0.06] hover:text-ink lg:hidden"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              aria-hidden
            >
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 8h16M4 16h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div
          id="docs-mobile-nav"
          className="docs-sheet max-h-[70vh] overflow-y-auto border-t border-ink/8 px-4 py-7 lg:hidden"
        >
          <DocsNav onNavigate={() => setOpen(false)} />
        </div>
      )}
    </header>
  );
}
