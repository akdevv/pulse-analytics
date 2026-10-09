"use client";

import { useState } from "react";
import {
  ChartColumn,
  Cog,
  Database,
  Globe,
  Layers,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  siDocker,
  siExpress,
  siNextdotjs,
  siNodedotjs,
  siPostgresql,
  siReact,
  siRedis,
  siTailwindcss,
  siTimescale,
  siTypescript,
  type SimpleIcon,
} from "simple-icons";
import { cn } from "@/lib/utils";
import { useTicker } from "./motion";
import { Reveal } from "./shared";

type Node = {
  icon: LucideIcon;
  name: string;
  detail: string;
  stat: (n: number) => string;
};

// Illustrative numbers, scaled from the 10k/s design target.
const NODES: Node[] = [
  {
    icon: Globe,
    name: "Browser",
    detail: "3 KB script",
    stat: (n) => `${(n * 7).toLocaleString("en-US")} hits`,
  },
  {
    icon: Zap,
    name: "Ingest",
    detail: "Validate, 204",
    stat: () => "4.8 ms p90",
  },
  {
    icon: Layers,
    name: "Queue",
    detail: "BullMQ on Redis",
    stat: (n) => `${12 + (n % 9)} waiting`,
  },
  {
    icon: Cog,
    name: "Worker",
    detail: "Parse, geo, batch",
    stat: (n) => `batch ${(n * 7) % 100}/100`,
  },
  {
    icon: Database,
    name: "TimescaleDB",
    detail: "Hourly rollups",
    stat: (n) => `${Math.floor(n / 14) + 128} inserts`,
  },
  {
    icon: ChartColumn,
    name: "Dashboard",
    detail: "Reads rollups",
    stat: () => "live over SSE",
  },
];

const STACK: SimpleIcon[] = [
  siTypescript,
  siNodedotjs,
  siExpress,
  siRedis,
  siPostgresql,
  siTimescale,
  siNextdotjs,
  siReact,
  siTailwindcss,
  siDocker,
];

export function Pipeline() {
  const [n, setN] = useState(0);
  const ref = useTicker<HTMLDivElement>(() => setN((v) => v + 1), 450);

  return (
    <section
      aria-labelledby="pipeline-title"
      className="relative py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mb-10 flex flex-col items-center text-center md:mb-14">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-ink/3 px-3 py-1 text-[12px] text-ink/60">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-tangerine opacity-70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-tangerine" />
            </span>
            The whole trip
          </span>
          <h2
            id="pipeline-title"
            className="max-w-2xl font-display text-[30px] leading-[1.05] font-semibold tracking-[-0.03em] text-balance text-ink sm:text-[40px]"
          >
            From a click to a chart{" "}
            <span className="text-ink/35">in under a second.</span>
          </h2>
        </Reveal>

        <Reveal delay={80}>
          <div
            ref={ref}
            className="relative overflow-hidden rounded-3xl border border-ink/8 bg-surface-1/60 p-4 shadow-edge sm:p-6"
          >
            <div aria-hidden className="pa-grid-pan absolute inset-0" />
            <ol className="relative flex flex-col md:flex-row">
              {NODES.map((node, i) => (
                <li
                  key={node.name}
                  className="flex min-w-0 flex-col md:flex-1 md:flex-row md:items-stretch"
                >
                  <NodeCard node={node} n={n} index={i} />
                  {i < NODES.length - 1 && <Wire index={i} />}
                </li>
              ))}
            </ol>
          </div>
        </Reveal>

        <Reveal delay={140} className="mt-10">
          <p className="mb-5 text-center text-[12.5px] text-ink/40">
            Built on boring, well-understood parts
          </p>
          <div className="pa-marquee relative overflow-hidden">
            <ul className="pa-marquee-track flex w-max items-center gap-12">
              {[...STACK, ...STACK].map((icon, i) => (
                <li
                  key={i}
                  aria-hidden={i >= STACK.length}
                  className="flex items-center gap-2.5 text-ink/40 transition-colors duration-200 hover:text-ink/80"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-5 fill-current"
                    aria-hidden
                  >
                    <path d={icon.path} />
                  </svg>
                  <span className="text-[14px] font-medium whitespace-nowrap">
                    {icon.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function NodeCard({
  node,
  n,
  index,
}: {
  node: Node;
  n: number;
  index: number;
}) {
  const Icon = node.icon;
  // The highlight walks along the pipeline with the packets.
  const lit = n % NODES.length === index;
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-1 items-center gap-3 rounded-2xl border bg-charcoal/70 p-3 backdrop-blur-sm transition-[border-color,box-shadow] duration-300 ease-out md:flex-col md:items-start md:gap-4 md:p-4",
        lit
          ? "border-tangerine/40 shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-tangerine)_8%,transparent),0_12px_32px_-12px_var(--pa-accent-glow)]"
          : "border-ink/8"
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl border transition-colors duration-300",
          lit
            ? "border-tangerine/30 bg-tangerine/15 text-tangerine-soft"
            : "border-ink/10 bg-ink/4 text-ink/60"
        )}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium text-ink">{node.name}</div>
        <div className="truncate text-[12px] text-ink/45">{node.detail}</div>
      </div>
      <div className="font-mono text-[11px] whitespace-nowrap text-ink/55 tabular-nums md:mt-auto">
        {node.stat(n)}
      </div>
    </div>
  );
}

function Wire({ index }: { index: number }) {
  return (
    <div
      aria-hidden
      className="pa-wire relative mx-auto h-6 w-px shrink-0 md:mx-0 md:my-auto md:h-px md:w-5"
      style={{ "--pa-delay": `${index * 180}ms` } as React.CSSProperties}
    >
      <span className="pa-packet" />
      <span
        className="pa-packet"
        style={{ animationDelay: `calc(var(--pa-delay) + 600ms)` }}
      />
    </div>
  );
}
