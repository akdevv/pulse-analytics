"use client";

import { useMemo } from "react";
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
  fontSize: 11,
  fill: "currentColor",
  fillOpacity: 0.5,
};

const HOUR = new Intl.DateTimeFormat("en", { hour: "numeric", hour12: true });
const DAY = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const DAY_HOUR = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  hour12: true,
});

function toChartData(data: TimeseriesPoint[], interval: "hour" | "day") {
  const first = data[0];
  const last = data[data.length - 1];
  const spansDays =
    !!first &&
    !!last &&
    new Date(first.time).getDate() !== new Date(last.time).getDate();
  const axis = interval === "hour" && !spansDays ? HOUR : DAY;
  const tooltip = interval === "hour" ? DAY_HOUR : DAY;

  return data.map((d) => {
    const at = new Date(d.time);
    return {
      time: axis.format(at),
      full: tooltip.format(at),
      pageviews: d.pageviews,
      sessions: d.sessions,
    };
  });
}

interface Props {
  data?: TimeseriesPoint[];
  isLoading: boolean;
  error: Error | null;
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
  const chartData = useMemo(
    () => (data ? toChartData(data, interval) : undefined),
    [data, interval]
  );

  return (
    <div className="panel flex flex-col">
      <div className="panel-head">
        <span className="panel-title">Traffic</span>
        <Legend />
      </div>

      <div className="px-4 py-5 pr-6">
        {error ? (
          <p className="py-16 text-center text-sm text-destructive">
            {error.message}
          </p>
        ) : isLoading ? (
          <Skeleton className="h-[380px]" />
        ) : !chartData?.length ? (
          <p className="py-24 text-center text-sm text-foreground/45">
            No traffic in this range.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[380px] w-full">
            <AreaChart
              data={chartData}
              margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0.16}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--chart-1)"
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
                strokeWidth={1.25}
                strokeOpacity={0.65}
                fill="none"
                dot={false}
                activeDot={{ r: 3 }}
              />
              <Area
                type="monotone"
                dataKey="pageviews"
                stroke="var(--chart-1)"
                strokeWidth={1.75}
                fill="url(#pvGrad)"
                dot={false}
                activeDot={{ r: 3.5 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
