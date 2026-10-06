"use client";

import { useState } from "react";
import { RankedList } from "@/components/analytics/ranked-list";
import type { DeviceStats } from "@/lib/types/analytics.types";

type Tab = "devices" | "browsers" | "os";

const TABS: { value: Tab; label: string }[] = [
  { value: "devices", label: "Device" },
  { value: "browsers", label: "Browser" },
  { value: "os", label: "OS" },
];

interface Props {
  data?: DeviceStats;
  isLoading: boolean;
  error: Error | null;
}

export function DevicesChart({ data, isLoading, error }: Props) {
  const [tab, setTab] = useState<Tab>("devices");

  const rows = (
    tab === "devices"
      ? (data?.devices ?? []).map((r) => ({ name: r.device, v: r.pageviews }))
      : tab === "browsers"
        ? (data?.browsers ?? []).map((r) => ({
            name: r.browser,
            v: r.pageviews,
          }))
        : (data?.os ?? []).map((r) => ({ name: r.os, v: r.pageviews }))
  ).map((r) => ({ label: r.name || "Unknown", value: r.v }));

  return (
    <RankedList
      title="Technology"
      label="Name"
      unit="Views"
      tone="var(--chart-2)"
      mono={false}
      rows={rows}
      isLoading={isLoading}
      error={error}
      empty="No device data in this range."
      header={
        // Three cuts of one distribution, so they switch in place rather
        // than occupying three panels that say the same thing.
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
