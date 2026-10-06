"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeFrame } from "./code-frame";
import type { Lang } from "./highlight";

type InstallTab = {
  label: string;
  file: string;
  lang: Lang;
  html: string;
  code: string;
};

export function InstallCode({ tabs }: { tabs: InstallTab[] }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const tab = tabs[active];

  const copy = async () => {
    await navigator.clipboard.writeText(tab.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div
        role="tablist"
        aria-label="Install method"
        className="flex w-fit items-center rounded-lg bg-black/25 p-0.75 ring-1 ring-ink/6"
      >
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            id={`install-tab-${i}`}
            aria-selected={i === active}
            aria-controls="install-panel"
            onClick={() => {
              setActive(i);
              setCopied(false);
            }}
            className={cn(
              "h-7 cursor-pointer rounded-md px-3 text-[12.5px] font-medium transition-colors duration-150 ease-out",
              i === active
                ? "bg-surface-2 text-ink shadow-raised"
                : "text-ink/45 hover:text-ink/85"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        id="install-panel"
        role="tabpanel"
        aria-labelledby={`install-tab-${active}`}
      >
        <CodeFrame
          key={tab.file}
          file={tab.file}
          lang={tab.lang}
          html={tab.html}
          className="pa-fade"
          action={
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 font-sans text-[12px] text-ink/50 transition-colors duration-150 ease-out hover:bg-ink/6 hover:text-ink"
            >
              {copied ? (
                <Check aria-hidden size={13} className="text-powder" />
              ) : (
                <Copy aria-hidden size={13} />
              )}
              <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
            </button>
          }
        />
      </div>
    </div>
  );
}
