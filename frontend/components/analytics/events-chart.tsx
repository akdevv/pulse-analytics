"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompact } from "@/lib/format";
import { useEventProperties } from "@/hooks/useAnalytics";
import type {
  EventStat,
  DateRangeParams,
  PropertyStat,
} from "@/lib/types/analytics.types";

function groupByKey(rows: PropertyStat[]) {
  const groups = new Map<string, PropertyStat[]>();
  for (const row of rows) {
    const group = groups.get(row.key);
    if (group) group.push(row);
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
  const rows = data ?? [];

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
          <p className="mb-1 flex items-baseline gap-2 font-mono text-[11px] text-muted-foreground">
            {key}
            {values[0] && values[0].distinctValues > values.length ? (
              <span className="font-sans text-[10px] text-muted-foreground/60">
                top {values.length} of {values[0].distinctValues}
              </span>
            ) : null}
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
                <span className="shrink-0 text-foreground/60 tabular-nums">
                  {formatCompact(row.count)}
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
  const max = Math.max(1, ...(data ?? []).map((d) => d.count));

  return (
    <div className="panel flex flex-col px-5 py-4">
      <div className="mb-3 flex shrink-0 items-baseline justify-between gap-3">
        <span className="panel-title">Custom events</span>
        <span className="meta">
          {data?.length ? `${data.length} named` : "count · visitors"}
        </span>
      </div>

      {error ? (
        <p className="py-6 text-sm text-destructive">{error.message}</p>
      ) : isLoading ? (
        <div className="flex flex-col gap-[3px]">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[35px] rounded-[3px]" />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="py-6">
          <p className="text-sm text-foreground/45">
            No custom events in this range.
          </p>
          <p className="mt-1.5 text-xs text-foreground/35">
            Add{" "}
            <code className="font-mono">data-pulse-event=&quot;name&quot;</code>{" "}
            to a button, or call{" "}
            <code className="font-mono">Pulse.trackEvent()</code>.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[3px]">
          {data.map((row) => {
            const isOpen = expanded === row.eventName;
            return (
              <div key={row.eventName}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : row.eventName)}
                  aria-expanded={isOpen}
                  className="rank-row cursor-pointer"
                  style={
                    {
                      "--share": row.count / max,
                      "--bar": "var(--chart-1)",
                    } as React.CSSProperties
                  }
                >
                  <span
                    className="min-w-0 truncate font-mono text-foreground/85"
                    title={row.eventName}
                  >
                    {row.eventName}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2 font-mono text-[11px] tabular-nums">
                    <span className="rank-share text-foreground/40">
                      {formatCompact(row.visitors)}{" "}
                      {row.visitors === 1 ? "visitor" : "visitors"}
                    </span>
                    <span className="text-foreground/60">
                      {formatCompact(row.count)}
                    </span>
                  </span>
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
