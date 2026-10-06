"use client";

import { useState } from "react";
import { PanelTabs, RankedList } from "@/components/analytics/ranked-list";
import type { RealtimeStats } from "@/lib/types/analytics.types";

type Tab = "pages" | "referrers" | "events";

const TABS = [
  { value: "pages", label: "Pages" },
  { value: "referrers", label: "Sources" },
  { value: "events", label: "Events" },
] as const satisfies readonly { value: Tab; label: string }[];

const COLUMNS: Record<Tab, { label: string; unit: string }> = {
  pages: { label: "Page", unit: "Sessions" },
  referrers: { label: "Source", unit: "Sessions" },
  events: { label: "Event", unit: "Count" },
};

interface Props {
  data?: RealtimeStats;
  isLoading: boolean;
  error: Error | null;
}

function toRows(data: RealtimeStats | undefined, tab: Tab) {
  switch (tab) {
    case "pages":
      return data?.activePages.map((r) => ({
        label: r.path,
        value: r.activeSessions,
      }));
    case "referrers":
      return data?.topReferrers.map((r) => ({
        label: r.referrer || "Direct",
        value: r.activeSessions,
      }));
    case "events":
      return data?.events.map((r) => ({ label: r.name, value: r.count }));
  }
}

export function RealtimeWidget({ data, isLoading, error }: Props) {
  const [tab, setTab] = useState<Tab>("pages");

  return (
    <RankedList
      title="Right now"
      {...COLUMNS[tab]}
      tone="var(--chart-2)"
      mono={tab !== "referrers"}
      rows={toRows(data, tab)}
      isLoading={isLoading}
      error={error}
      empty="Nothing in the last few minutes."
      header={<PanelTabs tabs={TABS} value={tab} onChange={setTab} />}
    />
  );
}
