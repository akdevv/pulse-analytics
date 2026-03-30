"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  useOverview,
  useTimeseries,
  useTopPages,
  useReferrers,
  useDevices,
  useGeo,
  useRealtime,
} from "@/hooks/useAnalytics";
import { DateRangeBar } from "@/components/analytics/date-range-bar";
import type { Preset, Interval } from "@/components/analytics/date-range-bar";
import { OverviewCards } from "@/components/analytics/overview-cards";
import { TimeseriesChart } from "@/components/analytics/timeseries-chart";
import { TopPagesChart } from "@/components/analytics/top-pages-chart";
import { ReferrersChart } from "@/components/analytics/referrers-chart";
import { DevicesChart } from "@/components/analytics/devices-chart";
import { GeoChart } from "@/components/analytics/geo-chart";
import { RealtimeWidget } from "@/components/analytics/realtime-widget";

function computeDateRange(preset: Preset, interval: Interval) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(
    from.getDate() - (preset === "7d" ? 7 : preset === "30d" ? 30 : 90),
  );
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    interval,
    limit: 10,
  };
}

export default function SiteAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [preset, setPreset] = useState<Preset>("7d");
  const [interval, setInterval] = useState<Interval>("hour");
  const dateRange = useMemo(
    () => computeDateRange(preset, interval),
    [preset, interval],
  );

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
  } = useOverview(id, dateRange);

  const {
    data: timeseries,
    isLoading: timeseriesLoading,
    error: timeseriesError,
  } = useTimeseries(id, dateRange);

  const {
    data: pages,
    isLoading: pagesLoading,
    error: pagesError,
  } = useTopPages(id, dateRange);

  const {
    data: referrers,
    isLoading: referrersLoading,
    error: referrersError,
  } = useReferrers(id, dateRange);

  const {
    data: devices,
    isLoading: devicesLoading,
    error: devicesError,
  } = useDevices(id, dateRange);

  const {
    data: geo,
    isLoading: geoLoading,
    error: geoError,
  } = useGeo(id, dateRange);

  const {
    data: realtime,
    isLoading: realtimeLoading,
    error: realtimeError,
  } = useRealtime(id);

  return (
    <div className="space-y-5 p-1 pb-10">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Site performance overview
          </p>
        </div>
        <DateRangeBar
          preset={preset}
          interval={interval}
          onPresetChange={setPreset}
          onIntervalChange={setInterval}
        />
      </div>

      {/* Overview stat cards */}
      <OverviewCards
        data={overview?.data}
        isLoading={overviewLoading}
        error={overviewError}
      />

      {/* Traffic timeseries — full width */}
      <TimeseriesChart
        data={timeseries?.data}
        isLoading={timeseriesLoading}
        error={timeseriesError}
      />

      {/* Pages + Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TopPagesChart
          data={pages?.data}
          isLoading={pagesLoading}
          error={pagesError}
        />
        <ReferrersChart
          data={referrers?.data}
          isLoading={referrersLoading}
          error={referrersError}
        />
      </div>

      {/* Technology + Geography */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DevicesChart
          data={devices?.data}
          isLoading={devicesLoading}
          error={devicesError}
        />
        <GeoChart data={geo?.data} isLoading={geoLoading} error={geoError} />
      </div>

      {/* Realtime */}
      <RealtimeWidget
        data={realtime?.data}
        isLoading={realtimeLoading}
        error={realtimeError}
      />
    </div>
  );
}
