"use client";

import { useState } from "react";
import { RankedList } from "@/components/analytics/ranked-list";
import type { RealtimeStats } from "@/lib/types/analytics.types";

type Tab = "pages" | "referrers" | "events";

const TABS: { value: Tab; label: string }[] = [
  { value: "pages", label: "Pages" },
  { value: "referrers", label: "Sources" },
  { value: "events", label: "Events" },
];

interface Props {
  data?: RealtimeStats;
  isLoading: boolean;
  error: Error | null;
}

/**
 * What is happening this minute, as against the window every other panel
 * reports on. It was three summary figures and three stacked lists above the
 * fold — the dashboard restated in miniature, and louder than the dashboard.
 * The headline moved into the metric row; what is left is the part the window
 * cannot tell you, in one panel, in telemetry blue.
 */
export function RealtimeWidget({ data, isLoading, error }: Props) {
  const [tab, setTab] = useState<Tab>("pages");

  const rows =
    tab === "pages"
      ? data?.activePages.map((r) => ({
          label: r.path,
          value: r.activeSessions,
        }))
      : tab === "referrers"
        ? data?.topReferrers.map((r, i) => ({
            label: r.referrer || "Direct",
            title: `${r.referrer ?? "Direct"} #${i}`,
            value: r.activeSessions,
          }))
        : data?.events.map((r) => ({ label: r.name, value: r.count }));

  return (
    <RankedList
      title="Right now"
      label="Page"
      unit="Sessions"
      tone="var(--chart-2)"
      mono={tab !== "referrers"}
      rows={rows}
      isLoading={isLoading}
      error={error}
      empty="Nothing in the last few minutes."
      header={
        <div role="tablist" className="flex items-center gap-0.5">
          {TABS.map(({ value, label }) => {
            const on = tab === value;
            return (
              <button
                key={value}
                role="tab"
                aria-selected={on}
                onClick={() => setTab(value)}
                className={`meta cursor-pointer rounded px-2 py-1 transition-colors duration-150 ease-[var(--ease-out)] ${
                  on
                    ? "bg-muted text-foreground"
                    : "hover:bg-foreground/[0.05] hover:text-foreground/80"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      }
    />
  );
}
