"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { formatCompact } from "@/lib/format";
import type { OverviewStats } from "@/lib/types/analytics.types";

const STATS = [
  { key: "totalPageviews", label: "Pageviews" },
  { key: "totalSessions", label: "Sessions" },
  { key: "totalVisitors", label: "Visitors" },
] as const satisfies readonly { key: keyof OverviewStats; label: string }[];

interface Props {
  data?: OverviewStats;
  isLoading: boolean;
  error: Error | null;
  /** Sessions open right now. Not a window total, so it reads in powder. */
  activeSessions?: number;
  activeLoading: boolean;
}

function Cell({
  label,
  children,
  pip = false,
}: {
  label: string;
  children: React.ReactNode;
  pip?: boolean;
}) {
  return (
    <div className="panel px-5 py-4">
      <p className="meta flex items-center gap-2">
        {pip && (
          <span className="relative flex size-1.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-secondary opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-secondary" />
          </span>
        )}
        {label}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/**
 * The window's totals, and beside them the one figure that is not a total.
 *
 * "Active now" used to head a panel of its own that restated the dashboard in
 * miniature. It belongs here, in the row the eye already reads first, tinted
 * away from the accent so it is not mistaken for a fourth window total.
 */
export function OverviewCards({
  data,
  isLoading,
  error,
  activeSessions,
  activeLoading,
}: Props) {
  if (error) {
    return (
      <p className="panel px-5 py-4 text-sm text-destructive">
        Failed to load overview: {error.message}
      </p>
    );
  }

  return (
    <div className="seam grid grid-cols-2 lg:grid-cols-4">
      {STATS.map(({ key, label }, i) => (
        <Cell key={key} label={label}>
          {isLoading ? (
            <Skeleton className="h-[30px] w-24" />
          ) : (
            <p
              className="figure pa-fade-in text-[30px]"
              style={{ ["--pa-delay" as string]: `${i * 70}ms` }}
            >
              {formatCompact(data?.[key] ?? 0)}
            </p>
          )}
        </Cell>
      ))}

      <Cell label="Active now" pip>
        {activeLoading ? (
          <Skeleton className="h-[30px] w-16" />
        ) : (
          <p className="figure pa-fade-in text-[30px] text-secondary">
            {(activeSessions ?? 0).toLocaleString()}
          </p>
        )}
      </Cell>
    </div>
  );
}
