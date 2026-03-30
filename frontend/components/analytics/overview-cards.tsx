"use client";

import { Eye, Users, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { OverviewStats } from "@/lib/types/analytics.types";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

const STATS = [
  {
    key: "totalPageviews" as keyof OverviewStats,
    label: "Pageviews",
    icon: Eye,
    accent: "#f97316",
    bg: "rgba(249,115,22,0.07)",
  },
  {
    key: "totalSessions" as keyof OverviewStats,
    label: "Sessions",
    icon: Activity,
    accent: "#22d3ee",
    bg: "rgba(34,211,238,0.07)",
  },
  {
    key: "totalVisitors" as keyof OverviewStats,
    label: "Unique Visitors",
    icon: Users,
    accent: "#a78bfa",
    bg: "rgba(167,139,250,0.07)",
  },
] as const;

interface Props {
  data?: OverviewStats;
  isLoading: boolean;
  error: Error | null;
}

export function OverviewCards({ data, isLoading, error }: Props) {
  if (error) {
    return (
      <p className="text-sm text-destructive">
        Failed to load overview: {error.message}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {STATS.map(({ key, label, icon: Icon, accent, bg }) => (
        <div
          key={key}
          className="relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-border/80 hover:shadow-lg"
        >
          {/* Ambient glow */}
          <div
            className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full blur-3xl"
            style={{ background: accent, opacity: 0.08 }}
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ color: accent, opacity: 0.8 }}
              >
                {label}
              </p>
              {isLoading ? (
                <Skeleton className="mt-2.5 h-10 w-28 rounded-lg" />
              ) : (
                <p className="mt-1 text-[2.75rem] font-bold leading-none tracking-tight tabular-nums">
                  {fmt(data?.[key] ?? 0)}
                </p>
              )}
            </div>
            <div
              className="shrink-0 rounded-xl p-2.5 mt-0.5"
              style={{ background: bg }}
            >
              <Icon className="size-[18px]" style={{ color: accent }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
