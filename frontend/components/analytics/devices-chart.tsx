"use client";

import { useState } from "react";
import { PanelTabs, RankedList } from "@/components/analytics/ranked-list";
import type { DeviceStats } from "@/lib/types/analytics.types";

type Tab = keyof DeviceStats;

const TABS = [
  { value: "devices", label: "Device" },
  { value: "browsers", label: "Browser" },
  { value: "os", label: "OS" },
] as const satisfies readonly { value: Tab; label: string }[];

interface Props {
  data?: DeviceStats;
  isLoading: boolean;
  error: Error | null;
}

function toRows(data: DeviceStats | undefined, tab: Tab) {
  switch (tab) {
    case "devices":
      return data?.devices.map((r) => ({
        label: r.device,
        value: r.pageviews,
      }));
    case "browsers":
      return data?.browsers.map((r) => ({
        label: r.browser,
        value: r.pageviews,
      }));
    case "os":
      return data?.os.map((r) => ({ label: r.os, value: r.pageviews }));
  }
}

export function DevicesChart({ data, isLoading, error }: Props) {
  const [tab, setTab] = useState<Tab>("devices");
  const rows = toRows(data, tab)?.map((r) => ({
    ...r,
    label: r.label || "Unknown",
  }));

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
      header={<PanelTabs tabs={TABS} value={tab} onChange={setTab} />}
    />
  );
}
