"use client";

import { RankedList } from "@/components/analytics/ranked-list";
import type { GeoStat } from "@/lib/types/analytics.types";

// Flag emoji were standing in for this: they render as two letters on Windows,
// as a picture everywhere else, and fell back to a globe for anything
// unresolved. Intl ships the names, so the row can say the country.
const REGIONS =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

function countryName(code: string): string {
  if (!code) return "Unknown";
  try {
    return REGIONS?.of(code.toUpperCase()) ?? code;
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
      unit="views"
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
