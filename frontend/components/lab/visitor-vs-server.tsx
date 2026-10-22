"use client";

import { useState } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, useLoop } from "./kit";

// The axis is broken: the first 10 ms get 30% of the width so the visitor's
// 4.8 ms is visible next to the rest of the trip.
const ZOOM_MS = 10;
const ZOOM_W = 0.3;
const END_MS = 900;
const pos = (ms: number) =>
  ms <= ZOOM_MS
    ? (ms / ZOOM_MS) * ZOOM_W
    : ZOOM_W + ((ms - ZOOM_MS) / (END_MS - ZOOM_MS)) * (1 - ZOOM_W);

type Span = {
  label: string;
  from: number;
  to: number;
  kind: "visitor" | "sync" | "wait" | "async";
};

const VISITOR: Span[] = [
  { label: "GET /track → 204", from: 0, to: 4.8, kind: "visitor" },
];
const SERVER: Span[] = [
  { label: "Ingest: validate, enqueue, reply", from: 0, to: 4.8, kind: "sync" },
  { label: "Waiting in the queue", from: 4.8, to: 600, kind: "wait" },
  {
    label: "Worker: parse, geo, batch insert",
    from: 600,
    to: 660,
    kind: "async",
  },
  { label: "Rollup refresh", from: 660, to: 720, kind: "async" },
  { label: "Push to dashboard", from: 720, to: 900, kind: "async" },
];

const PLAY = 6; // seconds for the playhead to cross
const HOLD = 1.8;

export function VisitorVsServer() {
  const [k, setK] = useState(0);
  const ref = useLoop<HTMLDivElement>((dt) =>
    setK((v) => (v + dt) % (PLAY + HOLD))
  );

  // The playhead moves evenly across the drawn axis, not through time.
  const head = Math.min(1, k / PLAY);
  const ms = (() => {
    if (head <= ZOOM_W) return (head / ZOOM_W) * ZOOM_MS;
    return ZOOM_MS + ((head - ZOOM_W) / (1 - ZOOM_W)) * (END_MS - ZOOM_MS);
  })();
  const sent = ms >= 4.8;
  const onChart = ms >= 899;

  const bar = (s: Span) => {
    const a = pos(s.from);
    const b = pos(s.to);
    const shown = Math.max(0, Math.min(b, head) - a);
    return (
      <div className="relative h-7">
        <div
          className={cn(
            "absolute top-1/2 h-4 -translate-y-1/2 rounded-[4px]",
            s.kind === "visitor" && "bg-tangerine",
            s.kind === "sync" && "bg-tangerine/70",
            s.kind === "async" && "bg-powder/60",
            s.kind === "wait" &&
              "bg-[repeating-linear-gradient(90deg,rgb(229_227_210/0.18)_0_4px,transparent_4px_8px)]"
          )}
          style={{ left: `${a * 100}%`, width: `${shown * 100}%` }}
        />
      </div>
    );
  };

  return (
    <div ref={ref} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* What the visitor sees. */}
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-surface-1">
          <div className="flex items-center gap-1.5 border-b border-ink/8 px-3 py-2">
            <span className="size-2 rounded-full bg-ink/15" />
            <span className="size-2 rounded-full bg-ink/15" />
            <span className="size-2 rounded-full bg-ink/15" />
            <span className="ml-2 truncate rounded-md bg-ink/5 px-2 py-0.5 font-mono text-[10.5px] text-ink/45">
              yoursite.com/pricing
            </span>
          </div>
          <div className="flex flex-col gap-2 p-4">
            <div className="h-3 w-2/3 rounded bg-ink/12" />
            <div className="h-2 w-full rounded bg-ink/7" />
            <div className="h-2 w-5/6 rounded bg-ink/7" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-md border border-ink/8 bg-ink/3"
                />
              ))}
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 border-t border-ink/8 px-3 py-2.5 font-mono text-[11px] transition-colors",
              sent ? "text-powder" : "text-ink/50"
            )}
          >
            {sent ? (
              <Check size={13} />
            ) : (
              <Loader2 size={13} className="animate-spin" />
            )}
            {sent ? "pageview sent · 204 in 4.8 ms" : "sending pageview…"}
          </div>
          <p className="px-3 pb-3 text-[12px] text-ink/45">
            {sent
              ? "The visitor carries on. Nothing else on this page waits for Pulse."
              : "The visitor opened the page."}
          </p>
        </div>

        {/* The timeline. */}
        <div className="rounded-2xl border border-ink/8 bg-well p-4 sm:p-5">
          <div className="grid grid-cols-[minmax(0,150px)_minmax(0,1fr)] gap-x-4 sm:grid-cols-[200px_minmax(0,1fr)]">
            <div className="col-span-2 mb-2 flex items-center justify-between text-[12px] text-ink/45">
              <span>Time since the click</span>
              <span className="font-display text-[22px] font-semibold text-tangerine-soft tabular-nums">
                {ms < 100
                  ? `${ms.toFixed(1)} ms`
                  : `${(ms / 1000).toFixed(2)} s`}
              </span>
            </div>

            <div className="col-span-2 mt-1 mb-1 font-mono text-[10.5px] tracking-[0.08em] text-tangerine-soft uppercase">
              The visitor
            </div>
            {VISITOR.map((s) => (
              <Row key={s.label} label={s.label} head={head}>
                {bar(s)}
              </Row>
            ))}

            <div className="col-span-2 mt-4 mb-1 font-mono text-[10.5px] tracking-[0.08em] text-powder uppercase">
              Pulse
            </div>
            {SERVER.map((s) => (
              <Row key={s.label} label={s.label} head={head}>
                {bar(s)}
              </Row>
            ))}

            <div />
            <div className="relative mt-3 h-5 border-t border-ink/12 font-mono text-[10.5px] text-ink/40">
              <span className="absolute left-0 pt-1">0</span>
              <span
                className="absolute pt-1"
                style={{
                  left: `${pos(4.8) * 100}%`,
                  transform: "translateX(-50%)",
                }}
              >
                4.8 ms
              </span>
              <span
                className="absolute pt-1"
                style={{
                  left: `${ZOOM_W * 100}%`,
                  transform: "translateX(-50%)",
                }}
              >
                10 ms
              </span>
              <span
                className="absolute pt-1"
                style={{
                  left: `${pos(600) * 100}%`,
                  transform: "translateX(-50%)",
                }}
              >
                0.6 s
              </span>
              <span className="absolute right-0 pt-1">0.9 s</span>
              <span
                className="absolute -top-2 h-3 w-2 -translate-x-1/2 skew-x-[-20deg] border-x border-ink/30 bg-well"
                style={{ left: `${ZOOM_W * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4 text-[12px] text-ink/55">
          <span className="flex items-center gap-2">
            <i className="h-2.5 w-4 rounded-sm bg-tangerine" />
            The visitor waits
          </span>
          <span className="flex items-center gap-2">
            <i className="h-2.5 w-4 rounded-sm bg-powder/60" />
            Background work
          </span>
          <span className="flex items-center gap-2">
            <i className="h-2.5 w-4 rounded-sm bg-[repeating-linear-gradient(90deg,rgb(229_227_210/0.3)_0_3px,transparent_3px_6px)]" />
            Waiting in the queue
          </span>
          <span className="text-ink/40">
            The first 10 ms are stretched so the 4.8 ms is visible.
          </span>
        </div>
        <Button onClick={() => setK(0)}>
          <RotateCcw size={13} /> Replay
        </Button>
      </div>
      {onChart && (
        <span className="sr-only">
          The pageview reached the dashboard after 0.9 seconds.
        </span>
      )}
    </div>
  );
}

function Row({
  label,
  head,
  children,
}: {
  label: string;
  head: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="truncate py-1 text-[12.5px] text-ink/65">{label}</div>
      <div className="relative">
        {children}
        <div
          aria-hidden
          className="absolute top-0 bottom-0 w-px bg-tangerine-soft/70"
          style={{ left: `${head * 100}%` }}
        />
      </div>
    </>
  );
}
