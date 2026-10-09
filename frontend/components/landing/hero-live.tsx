"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Channel, Led, Rolling, Scope } from "./instrument";
import { useTicker } from "./motion";

type Row = { key: string; value: string; note?: string };

// Mirrors what sdk/src/tracker.ts sends and the worker stores.
function readVisit(): Row[] {
  const ref = document.referrer ? new URL(document.referrer).hostname : "";
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Other";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "Other";
  return [
    { key: "path", value: location.pathname },
    { key: "referrer", value: ref || "(direct)" },
    { key: "language", value: navigator.language },
    { key: "screen", value: `${screen.width}x${screen.height}` },
    { key: "viewport", value: `${innerWidth}x${innerHeight}` },
    { key: "browser", value: `${browser} · ${os}` },
    { key: "visitor_id", value: "random", note: "kept in localStorage" },
    { key: "country", value: "from IP", note: "looked up by the worker" },
  ];
}

const NEVER = [
  { key: "ip_address", note: "used for the country, then dropped" },
  { key: "cookies", note: "none set" },
  { key: "fingerprint", note: "never computed" },
];

export function YourVisit() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    // Read after mount: these values only exist in the browser.
    const id = requestAnimationFrame(() => setRows(readVisit()));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="pa-panel relative overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-ink/8 px-4 py-3 font-mono text-[10.5px] tracking-[0.08em] text-ink/45 uppercase">
        <span>
          <span className="text-ink/25">IN.00 · </span>Your visit, as Pulse sees
          it
        </span>
        <Led pulse={rows ? 1 : 0} />
      </div>
      <dl className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-x-4 px-4 py-3 font-mono text-[12px] leading-[1.95]">
        {(rows ?? PLACEHOLDER).map((r, i) => (
          <div
            key={r.key}
            className={cn("contents", rows && "pa-row-in")}
            style={{ "--pa-delay": `${i * 70}ms` } as React.CSSProperties}
          >
            <dt className="text-powder/80">{r.key}</dt>
            <dd className="min-w-0 truncate text-ink/85">
              {rows ? r.value : <span className="text-ink/20">…</span>}
              {r.note && rows && (
                <span className="text-ink/35"> · {r.note}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className="border-t border-dashed border-ink/10 px-4 py-3 font-mono text-[12px] leading-[1.95]">
        {NEVER.map((n) => (
          <div key={n.key} className="flex min-w-0 gap-3">
            <span className="shrink-0 text-ink/40 line-through decoration-tangerine/70 decoration-[1.5px]">
              {n.key}
            </span>
            <span className="truncate text-ink/35">{n.note}</span>
          </div>
        ))}
      </div>
      <p className="border-t border-ink/8 px-4 py-2.5 text-[11.5px] text-ink/40">
        Read from your browser in this page. Nothing here was sent anywhere.
      </p>
    </div>
  );
}

const PLACEHOLDER: Row[] = [
  "path",
  "referrer",
  "language",
  "screen",
  "viewport",
  "browser",
  "visitor_id",
  "country",
].map((key) => ({ key, value: "" }));

// Live-looking demo readouts. Labelled as demo data in the UI.
export function InstrumentStrip() {
  const [tick, setTick] = useState(0);
  const ref = useTicker<HTMLDivElement>(() => setTick((t) => t + 1), 1100);

  const views = 48245 + tick * 3 + ((tick * 7) % 5);
  const live = 247 + (((tick * 13) % 17) - 8);

  return (
    <div ref={ref} className="pa-panel overflow-hidden rounded-2xl">
      <div className="grid grid-cols-2 gap-px bg-ink/8 md:grid-cols-6">
        <Channel
          id="CH.01"
          label="Pageviews · 24h"
          pulse={tick}
          className="col-span-2 md:col-span-2"
        >
          <div className="flex items-baseline gap-3">
            <Rolling
              value={views.toLocaleString("en-US")}
              className="text-[44px] leading-none text-ink sm:text-[52px]"
            />
            <span className="font-mono text-[12px] text-tangerine-soft">
              +8.6%
            </span>
          </div>
        </Channel>
        <Channel id="CH.02" label="Live" pulse={live}>
          <Rolling value={String(live)} className="text-[30px] text-ink" />
        </Channel>
        <Channel id="CH.03" label="p90">
          <span className="flex items-baseline gap-1.5">
            <Rolling value="4.8" className="text-[30px] text-ink" />
            <span className="font-mono text-[11px] text-ink/40">ms</span>
          </span>
        </Channel>
        <Channel id="CH.04" label="Cookies" led={false}>
          <Rolling value="0" className="text-[30px] text-ink" />
        </Channel>
        <Channel id="CH.05" label="IPs kept" led={false}>
          <Rolling value="0" className="text-[30px] text-ink" />
        </Channel>
        <div className="relative col-span-2 h-20 bg-well md:col-span-6">
          <Scope beat={tick} />
          <span className="absolute top-2.5 left-4 font-mono text-[10.5px] tracking-[0.08em] text-ink/30 uppercase">
            SC.06 · ingest trace
          </span>
          <span className="absolute top-2.5 right-4 font-mono text-[10.5px] tracking-[0.08em] text-ink/30 uppercase">
            demo data
          </span>
        </div>
      </div>
    </div>
  );
}
