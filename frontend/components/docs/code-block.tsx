"use client";

import { useRef, useState, type ReactNode } from "react";

/* Wraps the <pre> that shiki produced and adds a copy button. The text comes
   off the DOM node rather than the hast tree, so whatever the highlighter
   rendered is what lands on the clipboard. */
export function CodeBlock({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = ref.current?.innerText;
    if (!text) return;
    await navigator.clipboard.writeText(text.replace(/\n+$/, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="docs-code group relative my-6">
      <div ref={ref}>{children}</div>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="docs-copy absolute top-2.5 right-2.5 inline-flex size-7 items-center justify-center rounded-md text-ink/55 transition-[color,background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-ink/[0.08] hover:text-ink active:scale-95"
      >
        {copied ? (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-powder"
            aria-hidden
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        )}
      </button>
    </div>
  );
}
