"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { GeoStat } from "@/lib/types/analytics.types";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

// Convert ISO 3166-1 alpha-2 code to regional indicator emoji flag
function toFlag(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  const base = 0x1f1e6 - 65; // 'A' = 65
  const upper = code.toUpperCase();
  try {
    return String.fromCodePoint(
      upper.charCodeAt(0) + base,
      upper.charCodeAt(1) + base
    );
  } catch {
    return "🌐";
  }
}

interface Props {
  data?: GeoStat[];
  isLoading: boolean;
  error: Error | null;
}

export function GeoChart({ data, isLoading, error }: Props) {
  const max = data?.length ? Math.max(...data.map((d) => d.pageviews), 1) : 1;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Countries</h2>
        {data?.length ? (
          <span className="text-xs text-muted-foreground">
            {data.length} countries
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load geo data: {error.message}
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
            No geographic data for this range
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {data.map((row) => (
            <div key={row.country} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-center text-base leading-none select-none">
                {toFlag(row.country)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="truncate text-xs text-foreground/75">
                    {row.country || "Unknown"}
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
                        "linear-gradient(90deg, #d97706 0%, #fbbf24 100%)",
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
