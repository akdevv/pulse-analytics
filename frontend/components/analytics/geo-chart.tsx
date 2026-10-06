"use client";

import { RankedList } from "@/components/analytics/ranked-list";
import type { GeoStat } from "@/lib/types/analytics.types";

const REGIONS = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string): string {
  if (!code) return "Unknown";
  try {
    return REGIONS.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

interface Props {
  data?: GeoStat[];
  isLoading: boolean;
  error: Error | null;
}

export function GeoChart({ data, isLoading, error }: Props) {
  return (
    <RankedList
      title="Countries"
      label="Country"
      unit="Views"
      tone="var(--chart-3)"
      mono={false}
      rows={data?.map((d) => ({
        label: countryName(d.country),
        title: d.country,
        value: d.pageviews,
      }))}
      isLoading={isLoading}
      error={error}
      empty="No location data in this range."
    />
  );
}
