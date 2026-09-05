"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventProperties } from "@/hooks/useAnalytics";
import type {
  EventStat,
  DateRangeParams,
  PropertyStat,
} from "@/lib/types/analytics.types";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

/** Rows arrive flat, ordered by key then count. Group them back per key so
    each property renders as its own small list of values. */
function groupByKey(rows: PropertyStat[]): [string, PropertyStat[]][] {
  const groups = new Map<string, PropertyStat[]>();
  for (const row of rows) {
    const existing = groups.get(row.key);
    if (existing) existing.push(row);
    else groups.set(row.key, [row]);
  }
  return [...groups];
}

function PropertyBreakdown({
  siteId,
  name,
  dateRange,
}: {
  siteId: string;
  name: string;
  dateRange: DateRangeParams;
}) {
  const { data, isLoading, error } = useEventProperties(
    siteId,
    name,
    dateRange
  );
  const rows: PropertyStat[] = data?.data ?? [];

  if (error) {
    return (
      <p className="py-2 text-xs text-destructive">
        Failed to load properties: {error.message}
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-4 w-48 rounded" />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <p className="py-2 text-xs text-muted-foreground">
        No properties sent with this event.
      </p>
    );
  }

  return (
    <div className="space-y-3 py-2">
      {groupByKey(rows).map(([key, values]) => (
        <div key={key}>
          <p className="mb-1 font-mono text-[11px] text-muted-foreground">
            {key}
          </p>
          <div className="space-y-1">
            {values.map((row) => (
              <div
                key={row.value}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span
                  className="truncate font-mono text-foreground/70"
                  title={row.value}
                >
                  {row.value === "" ? "(empty)" : row.value}
                </span>
                <span className="shrink-0 tabular-nums text-foreground/60">
                  {fmt(row.count)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  siteId: string;
  dateRange: DateRangeParams;
  data?: EventStat[];
  isLoading: boolean;
  error: Error | null;
}

export function EventsChart({
  siteId,
  dateRange,
  data,
  isLoading,
  error,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const max = data?.length ? Math.max(...data.map((d) => d.count), 1) : 1;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Custom Events</h2>
        {data?.length ? (
          <span className="text-xs text-muted-foreground">
            {data.length} events
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load events: {error.message}
        </p>
      ) : isLoading ? (
        <div className="space-y-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="flex h-32 flex-col items-center justify-center gap-1 px-4 text-center">
          <p className="text-sm text-muted-foreground">
            No custom events for this range
          </p>
          <p className="text-xs text-muted-foreground/70">
            Add{" "}
            <code className="font-mono">data-pulse-event=&quot;name&quot;</code>{" "}
            to a button, or call{" "}
            <code className="font-mono">Pulse.trackEvent()</code>.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {data.map((row, i) => {
            const isOpen = expanded === row.eventName;
            return (
              <div key={row.eventName}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : row.eventName)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span className="w-5 shrink-0 text-right text-[11px] font-medium text-muted-foreground/40 tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span
                        className="truncate font-mono text-xs text-foreground/75"
                        title={row.eventName}
                      >
                        {row.eventName}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-foreground/80">
                        <span className="font-semibold">{fmt(row.count)}</span>
                        <span className="ml-2 text-muted-foreground">
                          {fmt(row.visitors)}{" "}
                          {row.visitors === 1 ? "visitor" : "visitors"}
                        </span>
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${(row.count / max) * 100}%`,
                          background:
                            "linear-gradient(90deg, #ea580c 0%, #fb923c 100%)",
                        }}
                      />
                    </div>
                  </div>
                </button>

                {isOpen ? (
                  <div className="ml-8 border-l border-border pl-3">
                    <PropertyBreakdown
                      siteId={siteId}
                      name={row.eventName}
                      dateRange={dateRange}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
