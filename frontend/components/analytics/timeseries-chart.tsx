"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { TimeseriesPoint } from "@/lib/types/analytics.types";

const chartConfig: ChartConfig = {
  pageviews: {
    label: "Pageviews",
    color: "#f97316",
  },
  sessions: {
    label: "Sessions",
    color: "#22d3ee",
  },
};

function fmtTick(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return `${v}`;
}

interface Props {
  data?: TimeseriesPoint[];
  isLoading: boolean;
  error: Error | null;
}

export function TimeseriesChart({ data, isLoading, error }: Props) {
  const chartData = data?.map((d) => ({
    time: new Date(d.time).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    }),
    pageviews: d.pageviews,
    sessions: d.sessions,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Traffic Over Time
        </h2>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ background: "#f97316" }}
            />
            Pageviews
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ background: "#22d3ee" }}
            />
            Sessions
          </span>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load timeseries: {error.message}
        </p>
      ) : isLoading ? (
        <Skeleton className="h-[220px] rounded-lg" />
      ) : !chartData?.length ? (
        <div className="flex h-[220px] items-center justify-center rounded-lg bg-muted/20">
          <p className="text-sm text-muted-foreground">
            No data for this range
          </p>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.14} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeOpacity={0.07} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.38 }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.38 }}
              tickFormatter={fmtTick}
              width={40}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="sessions"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#sessGrad)"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="pageviews"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#pvGrad)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
