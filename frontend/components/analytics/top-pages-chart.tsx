"use client";

import { RankedList } from "@/components/analytics/ranked-list";
import type { PageStat } from "@/lib/types/analytics.types";

interface Props {
  data?: PageStat[];
  isLoading: boolean;
  error: Error | null;
}

export function TopPagesChart({ data, isLoading, error }: Props) {
  return (
    <RankedList
      title="Top pages"
      label="Page"
      unit="Views"
      tone="var(--chart-1)"
      rows={data?.map((d) => ({ label: d.page, value: d.pageviews }))}
      isLoading={isLoading}
      error={error}
      empty="No pages in this range."
    />
  );
}
