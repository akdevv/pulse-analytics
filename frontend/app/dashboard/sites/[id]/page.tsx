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
  useRealtimeStream,
  useCustomEvents,
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
import { EventsChart } from "@/components/analytics/events-chart";

function computeDateRange(preset: Preset, interval: Interval) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(
    from.getDate() - (preset === "7d" ? 7 : preset === "30d" ? 30 : 90)
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
    [preset, interval]
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
    data: events,
    isLoading: eventsLoading,
    error: eventsError,
  } = useCustomEvents(id, dateRange);
  const {
    data: realtime,
    isLoading: realtimeLoading,
    error: realtimeError,
  } = useRealtimeStream(id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <DateRangeBar
          preset={preset}
          interval={interval}
          onPresetChange={setPreset}
          onIntervalChange={setInterval}
        />
      </div>

      <RealtimeWidget
        data={realtime ?? undefined}
        isLoading={realtimeLoading}
        error={realtimeError}
      />

      <OverviewCards
        data={overview?.data}
        isLoading={overviewLoading}
        error={overviewError}
      />

      <TimeseriesChart
        data={timeseries?.data}
        isLoading={timeseriesLoading}
        error={timeseriesError}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DevicesChart
          data={devices?.data}
          isLoading={devicesLoading}
          error={devicesError}
        />
        <GeoChart data={geo?.data} isLoading={geoLoading} error={geoError} />
      </div>

      <EventsChart
        siteId={id}
        dateRange={dateRange}
        data={events?.data}
        isLoading={eventsLoading}
        error={eventsError}
      />
    </div>
  );
}
