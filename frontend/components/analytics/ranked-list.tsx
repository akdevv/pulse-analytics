"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { formatCompact } from "@/lib/format";

export type Rank = { label: string; value: number; title?: string };

/**
 * Pages, referrers, countries, devices and events are all the same object: a
 * ranked distribution over one window. They had been four copies of the same
 * markup, each free to drift, and each drew its bar as a 1px rule under the
 * label — which reads as decoration rather than as the number's size.
 *
 * The bar is the row instead. Its width is the row's share of the leader and
 * its opacity rises with that share, so the shape of the distribution is
 * legible before a single label is read. The percentage stays hidden until
 * the row is pointed at, because it is the answer to a second question.
 */
export function RankedList({
  title,
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
  unit: string;
  rows?: Rank[];
  isLoading: boolean;
  error: Error | null;
  empty: string;
  /** Which chart token the bars are keyed to. */
  tone?: string;
  /** Paths and domains are mono; device and browser names are not. */
  mono?: boolean;
  /** Replaces the unit label — used by the panel that carries tabs. */
  header?: React.ReactNode;
}) {
  const total = rows?.reduce((sum, r) => sum + r.value, 0) ?? 0;
  const max = rows?.length ? Math.max(...rows.map((r) => r.value), 1) : 1;

  return (
    <div className="panel flex min-h-0 min-w-0 flex-col px-5 py-4">
      <div className="mb-3 flex shrink-0 items-baseline justify-between gap-3">
        <span className="panel-title">{title}</span>
        {header ?? <span className="meta">{unit}</span>}
      </div>

      {error ? (
        <p className="py-6 text-sm text-destructive">{error.message}</p>
      ) : isLoading ? (
        <div className="flex flex-col gap-[3px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[30px] rounded-[4px]" />
          ))}
        </div>
      ) : !rows?.length ? (
        <p className="py-6 text-sm text-foreground/45">{empty}</p>
      ) : (
        <div className="flex flex-col gap-[3px]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rank-row"
              style={
                {
                  "--share": row.value / max,
                  "--bar": tone,
                } as React.CSSProperties
              }
            >
              <span
                className={`min-w-0 truncate text-foreground/85 ${mono ? "font-mono" : ""}`}
                title={row.title ?? row.label}
              >
                {row.label}
              </span>
              <span className="flex shrink-0 items-baseline gap-2 font-mono text-[11px] tabular-nums">
                <span className="rank-share text-foreground/40">
                  {total > 0 ? ((row.value / total) * 100).toFixed(1) : "0.0"}%
                </span>
                <span className="text-foreground/60">
                  {formatCompact(row.value)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
