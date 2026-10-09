"use client";

import { useEffect, useRef, useState } from "react";
import { MousePointerClick, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTicker } from "./motion";

type Chip = { kind: "pageview" | "event"; label: string; country: string };

const LEFT: Chip[] = [
  { kind: "pageview", label: "/pricing", country: "DE" },
  { kind: "pageview", label: "/docs/quickstart", country: "IN" },
  { kind: "pageview", label: "/blog/rollups", country: "BR" },
  { kind: "pageview", label: "/", country: "US" },
];

const RIGHT: Chip[] = [
  { kind: "event", label: "signup", country: "US" },
  { kind: "event", label: "copy_snippet", country: "JP" },
  { kind: "event", label: "download", country: "FR" },
  { kind: "event", label: "signup", country: "GB" },
];

// Decorative event toasts floating beside the dashboard on wide screens.
export function LiveChips() {
  const [i, setI] = useState(0);
  const ref = useTicker<HTMLDivElement>(() => setI((n) => n + 1), 2600);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 hidden xl:block"
    >
      <div className="pa-float absolute top-[22%] -left-10">
        <ChipCard key={`l${i}`} chip={LEFT[i % LEFT.length]} />
      </div>
      <div
        className="pa-float absolute top-[44%] -right-10"
        style={{ animationDelay: "-3s" }}
      >
        <ChipCard key={`r${i}`} chip={RIGHT[i % RIGHT.length]} />
      </div>
    </div>
  );
}

function ChipCard({ chip }: { chip: Chip }) {
  const Icon = chip.kind === "pageview" ? Eye : MousePointerClick;
  return (
    <div className="pa-chip-in flex items-center gap-3 rounded-xl border border-ink/10 bg-charcoal/80 py-2 pr-4 pl-2 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)] backdrop-blur-xl">
      <span
        className={cn(
          "grid size-8 place-items-center rounded-lg",
          chip.kind === "pageview"
            ? "bg-powder/12 text-powder"
            : "bg-tangerine/15 text-tangerine-soft"
        )}
      >
        <Icon size={15} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] text-ink/45">
          {chip.kind === "pageview" ? "Pageview" : "Custom event"} ·{" "}
          {chip.country}
        </span>
        <span className="font-mono text-[12.5px] text-ink/85">
          {chip.label}
        </span>
      </span>
      <span className="ml-1 rounded-md bg-ink/6 px-1.5 py-0.5 font-mono text-[10.5px] text-ink/50">
        204
      </span>
    </div>
  );
}

// Brighter dots under the cursor, on top of the hero's dot grid.
export function CursorDots() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    const host = node?.parentElement;
    if (!node || !host) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = host.getBoundingClientRect();
      node.style.setProperty("--mx", `${e.clientX - r.left}px`);
      node.style.setProperty("--my", `${e.clientY - r.top}px`);
      node.style.opacity = "1";
    };
    const onLeave = () => (node.style.opacity = "0");
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  return <div ref={ref} aria-hidden className="pa-cursor-dots" />;
}
