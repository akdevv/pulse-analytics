"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { RealtimeStats } from "@/lib/types/analytics.types";

interface Props {
  data?: RealtimeStats;
  isLoading: boolean;
  error: Error | null;
}

export function RealtimeWidget({ data, isLoading, error }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2.5">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        <h2 className="text-sm font-semibold text-foreground">Realtime</h2>
        <span className="ml-auto text-[11px] text-muted-foreground/60">
          live · updates every 5s
        </span>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load realtime data: {error.message}
        </p>
      ) : (
        <>
          {/* Summary row */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            {/* Active sessions - highlighted */}
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-emerald-500/70 uppercase">
                Active Now
              </p>
              {isLoading ? (
                <Skeleton className="mt-2 h-9 w-16 rounded-lg" />
              ) : (
                <p className="mt-1 text-3xl leading-none font-bold text-emerald-400 tabular-nums">
                  {(data?.activeSessions ?? 0).toLocaleString()}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground/60 uppercase">
                Pageviews
              </p>
              {isLoading ? (
                <Skeleton className="mt-2 h-9 w-16 rounded-lg" />
              ) : (
                <p className="mt-1 text-3xl leading-none font-bold tabular-nums">
                  {(data?.pageviews ?? 0).toLocaleString()}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground/60 uppercase">
                Visitors
              </p>
              {isLoading ? (
                <Skeleton className="mt-2 h-9 w-16 rounded-lg" />
              ) : (
                <p className="mt-1 text-3xl leading-none font-bold tabular-nums">
                  {(data?.visitors ?? 0).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Active pages + referrers + events */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Active pages */}
            <div>
              <p className="mb-2.5 text-[11px] font-bold tracking-[0.12em] text-muted-foreground/60 uppercase">
                Active Pages
              </p>
              {isLoading ? (
                <Skeleton className="h-36 w-full rounded-lg" />
              ) : !data?.activePages?.length ? (
                <div className="flex h-16 items-center justify-center rounded-lg border border-border/50 bg-muted/10">
                  <p className="text-xs text-muted-foreground">
                    No active pages right now
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {data.activePages.map((row) => (
                    <div
                      key={row.path}
                      className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 px-3 py-2.5"
                    >
                      <span
                        className="min-w-0 truncate font-mono text-xs text-foreground/70"
                        title={row.path}
                      >
                        {row.path}
                      </span>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-400" />
                          {row.activeSessions}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {row.pageviews}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live referrers */}
            <div>
              <p className="mb-2.5 text-[11px] font-bold tracking-[0.12em] text-muted-foreground/60 uppercase">
                Live Referrers
              </p>
              {isLoading ? (
                <Skeleton className="h-36 w-full rounded-lg" />
              ) : !data?.topReferrers?.length ? (
                <div className="flex h-16 items-center justify-center rounded-lg border border-border/50 bg-muted/10">
                  <p className="text-xs text-muted-foreground">
                    No referrers right now
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {data.topReferrers.map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 px-3 py-2.5"
                    >
                      <span
                        className="min-w-0 truncate text-xs text-foreground/70"
                        title={row.referrer ?? "Direct / None"}
                      >
                        {row.referrer ?? "Direct / None"}
                      </span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums">
                        {row.activeSessions}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live custom events */}
            <div>
              <p className="mb-2.5 text-[11px] font-bold tracking-[0.12em] text-muted-foreground/60 uppercase">
                Live Events
              </p>
              {isLoading ? (
                <Skeleton className="h-36 w-full rounded-lg" />
              ) : !data?.events?.length ? (
                <div className="flex h-16 items-center justify-center rounded-lg border border-border/50 bg-muted/10">
                  <p className="text-xs text-muted-foreground">
                    No events right now
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {data.events.map((row) => (
                    <div
                      key={row.name}
                      className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 px-3 py-2.5"
                    >
                      <span
                        className="min-w-0 truncate font-mono text-xs text-foreground/70"
                        title={row.name}
                      >
                        {row.name}
                      </span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums">
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
