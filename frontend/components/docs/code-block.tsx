"use client";

import { useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

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
    <div className="group relative my-6">
      <div
        ref={ref}
        className="pa-code overflow-x-auto rounded-xl border border-ink/8 bg-well py-4 shadow-well"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute top-2.5 right-2.5 grid size-7 cursor-pointer place-items-center rounded-md text-ink/55 transition-[color,background-color,opacity] duration-150 ease-out group-hover:opacity-100 hover:bg-ink/8 hover:text-ink focus-visible:opacity-100 pointer-fine:opacity-0"
      >
        {copied ? (
          <Check aria-hidden size={13} className="text-powder" />
        ) : (
          <Copy aria-hidden size={13} />
        )}
      </button>
    </div>
  );
}
