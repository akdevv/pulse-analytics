"use client";

import { RankedList } from "@/components/analytics/ranked-list";
import type { ReferrerStat } from "@/lib/types/analytics.types";

interface Props {
  data?: ReferrerStat[];
  isLoading: boolean;
  error: Error | null;
}

export function ReferrersChart({ data, isLoading, error }: Props) {
  return (
    <RankedList
      title="Referrers"
      label="Source"
      unit="Views"
      tone="var(--chart-2)"
      rows={data?.map((d) => ({
        // An empty source is someone who typed the address or came from a
        // link that sent no referrer. Saying so beats an empty row.
        label: d.source || "Direct",
        value: d.pageviews,
      }))}
      isLoading={isLoading}
      error={error}
      empty="No referrers in this range."
    />
  );
}
