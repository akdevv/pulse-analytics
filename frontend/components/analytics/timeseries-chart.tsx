"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatTick } from "@/lib/format";
import type { TimeseriesPoint } from "@/lib/types/analytics.types";

const chartConfig: ChartConfig = {
  pageviews: { label: "Pageviews", color: "var(--chart-1)" },
  sessions: { label: "Sessions", color: "var(--chart-2)" },
};

const TICK = {
  fontSize: 10,
  fontFamily: "var(--font-mono)",
  letterSpacing: "0.08em",
  fill: "currentColor",
  fillOpacity: 0.45,
};

interface Props {
  data?: TimeseriesPoint[];
  isLoading: boolean;
  error: Error | null;
  /** Hourly buckets need the hour; every label was the same date without it. */
  interval: "hour" | "day";
}

function Legend() {
  return (
    <span className="flex items-center gap-3.5">
      {(["pageviews", "sessions"] as const).map((key) => (
        <span key={key} className="meta flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full"
            style={{ background: chartConfig[key].color }}
          />
          {chartConfig[key].label}
        </span>
      ))}
    </span>
  );
}

export function TimeseriesChart({ data, isLoading, error, interval }: Props) {
  const chartData = data?.map((d) => {
    const at = new Date(d.time);
    return {
      time:
        interval === "hour"
          ? at.toLocaleTimeString("en", { hour: "numeric", hour12: true })
          : at.toLocaleDateString("en", { month: "short", day: "numeric" }),
      // The axis is short; the tooltip can afford to say which day too.
      full: at.toLocaleString("en", {
        month: "short",
        day: "numeric",
        ...(interval === "hour" && { hour: "numeric", hour12: true }),
      }),
      pageviews: d.pageviews,
      sessions: d.sessions,
    };
  });

  return (
    <div className="panel flex flex-col">
      <div className="panel-head">
        <span className="panel-title">Traffic</span>
        <Legend />
      </div>

      <div className="px-5 py-4">
        {error ? (
          <p className="py-16 text-center text-sm text-destructive">
            {error.message}
          </p>
        ) : isLoading ? (
          <Skeleton className="h-[240px]" />
        ) : !chartData?.length ? (
          <p className="py-24 text-center text-sm text-foreground/45">
            No traffic in this range.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <AreaChart
              data={chartData}
              margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0.22}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--chart-2)"
                    stopOpacity={0.14}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--chart-2)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeOpacity={0.07} />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tick={TICK}
                interval="preserveStartEnd"
                minTickGap={44}
                tickMargin={10}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={TICK}
                tickFormatter={formatTick}
                width={38}
              />
              <ChartTooltip
                cursor={{ strokeOpacity: 0.18 }}
                content={<ChartTooltipContent labelKey="full" />}
              />
              <Area
                type="monotone"
                dataKey="sessions"
                stroke="var(--chart-2)"
                strokeWidth={1.5}
                strokeOpacity={0.75}
                fill="url(#sessGrad)"
                dot={false}
                activeDot={{ r: 3 }}
              />
              {/* The lead series carries the accent's glow, so the two lines
                  are told apart by weight and light rather than hue alone. */}
              <Area
                type="monotone"
                dataKey="pageviews"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#pvGrad)"
                dot={false}
                activeDot={{ r: 4 }}
                style={{ filter: "drop-shadow(0 0 6px var(--pa-accent-glow))" }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
