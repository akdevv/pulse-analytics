"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompact } from "@/lib/format";
import type { DeviceStats } from "@/lib/types/analytics.types";

type Tab = "devices" | "browsers" | "os";

// One chart token per tab. The bar's lighter end is derived from it by
// `.bar-fill`, so a hue change is a single value here.
const TAB_COLOR: Record<Tab, string> = {
  devices: "var(--chart-1)",
  browsers: "var(--chart-2)",
  os: "var(--chart-3)",
};

interface Props {
  data?: DeviceStats;
  isLoading: boolean;
  error: Error | null;
}

export function DevicesChart({ data, isLoading, error }: Props) {
  const [tab, setTab] = useState<Tab>("devices");

  const rows =
    tab === "devices"
      ? (data?.devices ?? []).map((r) => ({
          label: r.device || "Unknown",
          value: r.pageviews,
        }))
      : tab === "browsers"
        ? (data?.browsers ?? []).map((r) => ({
            label: r.browser || "Unknown",
            value: r.pageviews,
          }))
        : (data?.os ?? []).map((r) => ({
            label: r.os || "Unknown",
            value: r.pageviews,
          }));

  const max = rows.length ? Math.max(...rows.map((r) => r.value), 1) : 1;
  const color = TAB_COLOR[tab];

  const TABS: { value: Tab; label: string }[] = [
    { value: "devices", label: "Devices" },
    { value: "browsers", label: "Browsers" },
    { value: "os", label: "OS" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Technology</h2>
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
                tab === value
                  ? "bg-accent text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              }`}
              style={tab === value ? { color } : {}}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load devices: {error.message}
        </p>
      ) : isLoading ? (
        <div className="space-y-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No data for this range
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row, i) => (
            <div key={`${row.label}-${i}`} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-right text-[11px] font-medium text-muted-foreground/40 tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="truncate text-xs text-foreground/75">
                    {row.label}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-foreground/80 tabular-nums">
                    {formatCompact(row.value)}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="bar-fill h-full rounded-full transition-all duration-700 ease-out"
                    style={
                      {
                        width: `${(row.value / max) * 100}%`,
                        "--bar": color,
                      } as React.CSSProperties
                    }
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
