"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { formatCompact } from "@/lib/format";

type Rank = { label: string; value: number; title?: string };

export function PanelTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" className="flex items-center gap-0.5">
      {tabs.map((tab) => {
        const on = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab.value)}
            className={`meta cursor-pointer rounded px-2 py-1 transition-colors duration-150 ease-[var(--ease-out)] ${
              on
                ? "bg-muted text-foreground"
                : "hover:bg-foreground/[0.05] hover:text-foreground/80"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function RankedList({
  title,
  label,
  unit,
  rows,
  isLoading,
  error,
  empty,
  tone = "var(--chart-1)",
  mono = true,
  header,
}: {
  title: string;
  label: string;
  unit: string;
  rows?: Rank[];
  isLoading: boolean;
  error: Error | null;
  empty: string;
  tone?: string;
  mono?: boolean;
  header?: React.ReactNode;
}) {
  let total = 0;
  let max = 1;
  for (const row of rows ?? []) {
    total += row.value;
    if (row.value > max) max = row.value;
  }

  return (
    <div className="panel flex min-h-0 min-w-0 flex-col px-5 py-4">
      <div className="mb-3.5 flex shrink-0 items-center justify-between gap-3">
        <span className="panel-title">{title}</span>
        {header}
      </div>

      {error ? (
        <p className="py-8 text-sm text-destructive">{error.message}</p>
      ) : isLoading ? (
        <div className="flex flex-col gap-0.5">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-[35px] rounded-[3px]" />
          ))}
        </div>
      ) : !rows?.length ? (
        <p className="py-8 text-sm text-foreground/45">{empty}</p>
      ) : (
        <>
          <div className="rank-head">
            <span className="meta">{label}</span>
            <span className="meta">{unit}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {rows.map((row, i) => (
              <div
                key={`${i}-${row.label}`}
                className="rank-row"
                style={
                  {
                    "--share": row.value / max,
                    "--bar": tone,
                  } as React.CSSProperties
                }
              >
                <span
                  className={`min-w-0 truncate text-foreground/90 ${mono ? "font-mono text-[12px]" : ""}`}
                  title={row.title ?? row.label}
                >
                  {row.label}
                </span>
                <span className="flex shrink-0 items-baseline gap-2.5 tabular-nums">
                  <span className="rank-share text-[12px] text-foreground/40">
                    {total > 0 ? ((row.value / total) * 100).toFixed(1) : "0.0"}
                    %
                  </span>
                  <span className="font-medium text-foreground/75">
                    {formatCompact(row.value)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
