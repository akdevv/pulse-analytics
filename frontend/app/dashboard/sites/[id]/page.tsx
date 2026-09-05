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

const RANGE_LABEL: Record<Preset, string> = {
  "7d": "the last 7 days",
  "30d": "the last 30 days",
  "90d": "the last 90 days",
};

/**
 * Shown instead of the card grid when the range holds no events at all.
 * Eight cards each saying "no data" is eight ways of not answering the
 * question; the reasons a site reports nothing are few and checkable.
 */
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

  // Zero across all three counters means the range holds nothing — not that
  // one card came back thin. The realtime widget stays either way: it reads
  // raw events, so it is what turns this page into a dashboard the moment
  // something lands.
  const hasNoEvents =
    !overviewLoading &&
    !overviewError &&
    overview?.totalPageviews === 0 &&
    overview?.totalSessions === 0 &&
    overview?.totalVisitors === 0;

  return (
    <div className="flex flex-col">
      <SiteTabs>
        <DateRangeBar
          preset={preset}
          interval={interval}
          onPresetChange={setPreset}
          onIntervalChange={setInterval}
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
        // One seam grid, not a column of cards: the panels butt against each
        // other and the ground shows through as a hairline, so the page reads
        // as one instrument.
        <div className="seam grid flex-1 grid-cols-1 border-b border-[var(--seam)]">
          <OverviewCards
            data={overview}
            isLoading={overviewLoading}
            error={overviewError}
            activeSessions={realtime?.activeSessions}
            activeLoading={realtimeLoading}
          />

          <TimeseriesChart
            data={timeseries}
            isLoading={timeseriesLoading}
            error={timeseriesError}
            interval={interval}
          />

          <div className="seam grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
            <TopPagesChart
              data={pages}
              isLoading={pagesLoading}
              error={pagesError}
            />
            <RealtimeWidget
              data={realtime ?? undefined}
              isLoading={realtimeLoading}
              error={realtimeError}
            />
          </div>

          <div className="seam grid grid-cols-1 lg:grid-cols-3">
            <ReferrersChart
              data={referrers}
              isLoading={referrersLoading}
              error={referrersError}
            />
            <DevicesChart
              data={devices}
              isLoading={devicesLoading}
              error={devicesError}
            />
            <GeoChart data={geo} isLoading={geoLoading} error={geoError} />
          </div>

          <EventsChart
            siteId={id}
            dateRange={dateRange}
            data={events}
            isLoading={eventsLoading}
            error={eventsError}
          />
        </div>
      )}
    </div>
  );
}
