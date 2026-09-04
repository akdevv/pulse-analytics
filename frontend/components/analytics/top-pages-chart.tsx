"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { PageStat } from "@/lib/types/analytics.types";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

interface Props {
  data?: PageStat[];
  isLoading: boolean;
  error: Error | null;
}

export function TopPagesChart({ data, isLoading, error }: Props) {
  const max = data?.length ? Math.max(...data.map((d) => d.pageviews), 1) : 1;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Top Pages</h2>
        {data?.length ? (
          <span className="text-xs text-muted-foreground">
            {data.length} pages
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load pages: {error.message}
        </p>
      ) : isLoading ? (
        <div className="space-y-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No page data for this range
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {data.map((row, i) => (
            <div key={row.page} className="group flex items-center gap-3">
              <span className="w-5 shrink-0 text-right text-[11px] font-medium text-muted-foreground/40 tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span
                    className="truncate font-mono text-xs text-foreground/75"
                    title={row.page}
                  >
                    {row.page}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-foreground/80 tabular-nums">
                    {fmt(row.pageviews)}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${(row.pageviews / max) * 100}%`,
                      background:
                        "linear-gradient(90deg, #ea580c 0%, #fb923c 100%)",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
