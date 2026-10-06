"use client";

import { useMemo, useState } from "react";
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
import { SiteTabs } from "@/components/sites/site-tabs";
import { EmptyState, StepList } from "@/components/common/empty-state";
import { useSite } from "@/hooks/useSites";
import type { Preset, Interval } from "@/components/analytics/date-range-bar";
import { OverviewCards } from "@/components/analytics/overview-cards";
import { TimeseriesChart } from "@/components/analytics/timeseries-chart";
import { TopPagesChart } from "@/components/analytics/top-pages-chart";
import { ReferrersChart } from "@/components/analytics/referrers-chart";
import { DevicesChart } from "@/components/analytics/devices-chart";
import { GeoChart } from "@/components/analytics/geo-chart";
import { RealtimeWidget } from "@/components/analytics/realtime-widget";
import { EventsChart } from "@/components/analytics/events-chart";

const PRESET_DAYS: Record<Preset, number> = { "7d": 7, "30d": 30, "90d": 90 };

function computeRange(preset: Preset) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - PRESET_DAYS[preset]);
  return { from: from.toISOString(), to: to.toISOString(), limit: 10 };
}

const RANGE_LABEL: Record<Preset, string> = {
  "7d": "the last 7 days",
  "30d": "the last 30 days",
  "90d": "the last 90 days",
};

function NoEvents({
  domain,
  preset,
  setupHref,
}: {
  domain?: string;
  preset: Preset;
  setupHref: string;
}) {
  return (
    <EmptyState
      title="Nothing has arrived yet"
      description={`No events from this site in ${RANGE_LABEL[preset]}. A chart of zeros would not tell you anything, so here is what usually explains it.`}
      actions={[
        { label: "Open setup", href: setupHref, primary: true },
        { label: "Installation guide", href: "/docs/installation" },
      ]}
    >
      <StepList
        marker="query"
        items={[
          {
            title: "Is the snippet on the page?",
            body: (
              <>
                View source on the live site and search for{" "}
                <code className="font-mono text-[11px]">pulse.js</code>. An ad
                blocker can stop it loading too.
              </>
            ),
          },
          {
            title: "Does the hostname match?",
            body: (
              <>
                Events are only kept when the page&apos;s hostname is{" "}
                <code className="font-mono text-[11px]">
                  {domain ?? "this site's domain"}
                </code>{" "}
                or a subdomain of it — so a page served from localhost is
                dropped.
              </>
            ),
          },
          {
            title: "Did it look like it worked?",
            body: "It would either way. /track answers 204 on a rejected event exactly as it does on an accepted one, so the browser console stays clean.",
          },
        ]}
      />
    </EmptyState>
  );
}

export default function SiteAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: site } = useSite(id);
  const [preset, setPreset] = useState<Preset>("7d");
  const [interval, setTimeInterval] = useState<Interval>("hour");

  const range = useMemo(() => computeRange(preset), [preset]);
  const seriesRange = useMemo(
    () => ({ ...range, interval }),
    [range, interval]
  );

  const overview = useOverview(id, range);
  const timeseries = useTimeseries(id, seriesRange);
  const pages = useTopPages(id, range);
  const referrers = useReferrers(id, range);
  const devices = useDevices(id, range);
  const geo = useGeo(id, range);
  const events = useCustomEvents(id, range);
  const realtime = useRealtimeStream(id);

  const totals = overview.data;
  const hasNoEvents =
    !!totals &&
    totals.totalPageviews === 0 &&
    totals.totalSessions === 0 &&
    totals.totalVisitors === 0;

  return (
    <div className="flex flex-col">
      <SiteTabs>
        <DateRangeBar
          preset={preset}
          interval={interval}
          onPresetChange={setPreset}
          onIntervalChange={setTimeInterval}
        />
      </SiteTabs>

      {hasNoEvents ? (
        <div className="p-5">
          <NoEvents
            domain={site?.domain}
            preset={preset}
            setupHref={`/dashboard/sites/${id}/setup`}
          />
        </div>
      ) : (
        <div className="seam grid flex-1 grid-cols-1 border-b border-[var(--seam)]">
          <OverviewCards
            data={totals}
            isLoading={overview.isLoading}
            error={overview.error}
            activeSessions={realtime.data?.activeSessions}
            activeLoading={realtime.isLoading}
          />

          <TimeseriesChart
            data={timeseries.data}
            isLoading={timeseries.isLoading}
            error={timeseries.error}
            interval={interval}
          />

          <div className="seam grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
            <TopPagesChart
              data={pages.data}
              isLoading={pages.isLoading}
              error={pages.error}
            />
            <RealtimeWidget
              data={realtime.data ?? undefined}
              isLoading={realtime.isLoading}
              error={realtime.error}
            />
          </div>

          <div className="seam grid grid-cols-1 lg:grid-cols-3">
            <ReferrersChart
              data={referrers.data}
              isLoading={referrers.isLoading}
              error={referrers.error}
            />
            <DevicesChart
              data={devices.data}
              isLoading={devices.isLoading}
              error={devices.error}
            />
            <GeoChart
              data={geo.data}
              isLoading={geo.isLoading}
              error={geo.error}
            />
          </div>

          <EventsChart
            siteId={id}
            dateRange={range}
            data={events.data}
            isLoading={events.isLoading}
            error={events.error}
          />
        </div>
      )}
    </div>
  );
}
