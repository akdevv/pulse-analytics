"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  useOverview,
  useTimeseries,
  useTopPages,
  useReferrers,
  useDevices,
  useGeo,
  useRealtime,
} from "@/hooks/useAnalytics";
import type {
  DeviceStats,
  GeoStat,
  OverviewStats,
  PageStat,
  RealtimeStats,
  ReferrerStat,
  TimeseriesPoint,
} from "@/lib/types/analytics.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Preset = "7d" | "30d" | "90d";
type Interval = "day" | "hour";

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function computeDateRange(preset: Preset, interval: Interval) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (preset === "7d" ? 7 : preset === "30d" ? 30 : 90));
  return { from: toDateString(from), to: toDateString(to), interval, limit: 10 };
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function OverviewSection({
  data,
  isLoading,
  error,
}: {
  data?: OverviewStats;
  isLoading: boolean;
  error: Error | null;
}) {
  const stats = [
    { label: "Pageviews", value: data?.totalPageviews },
    { label: "Sessions", value: data?.totalSessions },
    { label: "Visitors", value: data?.totalVisitors },
  ];

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Overview
      </h2>
      {error ? (
        <p className="text-sm text-destructive">
          Failed to load overview: {error.message}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value }) => (
            <Card key={label} className="py-0">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold">
                  {isLoading ? "—" : (value ?? 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function TimeseriesSection({
  data,
  isLoading,
  error,
}: {
  data?: TimeseriesPoint[];
  isLoading: boolean;
  error: Error | null;
}) {
  const rows =
    data?.map((row) => ({
      key: row.time,
      time: new Date(row.time).toLocaleDateString(),
      pageviews: row.pageviews,
      sessions: row.sessions,
    })) ?? [];

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Timeseries
      </h2>
      {error ? (
        <p className="text-sm text-destructive">
          Failed to load timeseries: {error.message}
        </p>
      ) : null}
      <Card className="py-0">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Time</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Pageviews
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground"
                    colSpan={3}
                  >
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground"
                    colSpan={3}
                  >
                    No data for this range.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.key} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {row.time}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.pageviews.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.sessions.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}

function PagesSection({
  data,
  isLoading,
  error,
}: {
  data?: PageStat[];
  isLoading: boolean;
  error: Error | null;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Pages
      </h2>
      {error ? (
        <p className="text-sm text-destructive">
          Failed to load pages: {error.message}
        </p>
      ) : null}
      <Card className="py-0">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Path</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Pageviews
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground"
                    colSpan={2}
                  >
                    Loading…
                  </td>
                </tr>
              ) : (data?.length ?? 0) === 0 ? (
                <tr>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground"
                    colSpan={2}
                  >
                    No data for this range.
                  </td>
                </tr>
              ) : (
                data!.map((row) => (
                  <tr key={row.page} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {row.page}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.pageviews.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}

function ReferrersSection({
  data,
  isLoading,
  error,
}: {
  data?: ReferrerStat[];
  isLoading: boolean;
  error: Error | null;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Referrers
      </h2>
      {error ? (
        <p className="text-sm text-destructive">
          Failed to load referrers: {error.message}
        </p>
      ) : null}
      <Card className="py-0">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Referrer</th>
                <th className="px-4 py-2.5 text-right font-medium">Visitors</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground"
                    colSpan={2}
                  >
                    Loading…
                  </td>
                </tr>
              ) : (data?.length ?? 0) === 0 ? (
                <tr>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground"
                    colSpan={2}
                  >
                    No data for this range.
                  </td>
                </tr>
              ) : (
                data!.map((row) => (
                  <tr key={row.source} className="border-b last:border-0">
                    <td className="px-4 py-2.5 text-xs">{row.source}</td>
                    <td className="px-4 py-2.5 text-right">
                      {row.pageviews.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}

function DevicesSection({
  data,
  isLoading,
  error,
}: {
  data?: DeviceStats;
  isLoading: boolean;
  error: Error | null;
}) {
  const rows = data?.devices ?? [];

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Devices
      </h2>
      {error ? (
        <p className="text-sm text-destructive">
          Failed to load devices: {error.message}
        </p>
      ) : null}
      <Card className="py-0">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Device</th>
                <th className="px-4 py-2.5 text-right font-medium">Visitors</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground"
                    colSpan={2}
                  >
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground"
                    colSpan={2}
                  >
                    No data for this range.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.device} className="border-b last:border-0">
                    <td className="px-4 py-2.5 text-xs">{row.device}</td>
                    <td className="px-4 py-2.5 text-right">
                      {row.pageviews.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}

function GeoSection({
  data,
  isLoading,
  error,
}: {
  data?: GeoStat[];
  isLoading: boolean;
  error: Error | null;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Geo
      </h2>
      {error ? (
        <p className="text-sm text-destructive">
          Failed to load geo: {error.message}
        </p>
      ) : null}
      <Card className="py-0">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Country</th>
                <th className="px-4 py-2.5 text-right font-medium">Visitors</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground"
                    colSpan={2}
                  >
                    Loading…
                  </td>
                </tr>
              ) : (data?.length ?? 0) === 0 ? (
                <tr>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground"
                    colSpan={2}
                  >
                    No data for this range.
                  </td>
                </tr>
              ) : (
                data!.map((row) => (
                  <tr key={row.country} className="border-b last:border-0">
                    <td className="px-4 py-2.5 text-xs">{row.country}</td>
                    <td className="px-4 py-2.5 text-right">
                      {row.pageviews.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}

function RealtimeSection({
  data,
  isLoading,
  error,
}: {
  data?: RealtimeStats;
  isLoading: boolean;
  error: Error | null;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Realtime
      </h2>
      {error ? (
        <p className="text-sm text-destructive">
          Failed to load realtime: {error.message}
        </p>
      ) : null}
      <Card className="py-0">
        <CardContent className="p-4 flex items-center gap-3">
          <span className="size-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm">
            <span className="text-2xl font-bold">
              {isLoading ? "—" : (data?.activeSessions ?? 0).toLocaleString()}
            </span>{" "}
            active sessions right now
          </span>
        </CardContent>
      </Card>
      <Card className="mt-3 py-0">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Page</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Active sessions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground"
                    colSpan={2}
                  >
                    Loading…
                  </td>
                </tr>
              ) : (data?.activePages?.length ?? 0) === 0 ? (
                <tr>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground"
                    colSpan={2}
                  >
                    No active pages right now.
                  </td>
                </tr>
              ) : (
                data!.activePages.map((row) => (
                  <tr key={row.path} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {row.path}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.activeSessions.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}

// ─── Date range bar ───────────────────────────────────────────────────────────

function DateRangeBar({
  preset,
  interval,
  onPresetChange,
  onIntervalChange,
}: {
  preset: Preset;
  interval: Interval;
  onPresetChange: (p: Preset) => void;
  onIntervalChange: (i: Interval) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground">Range:</label>
      <select
        value={preset}
        onChange={(e) => onPresetChange(e.target.value as Preset)}
        className="rounded-md border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
      </select>
      <label className="text-xs text-muted-foreground ml-2">Interval:</label>
      <select
        value={interval}
        onChange={(e) => onIntervalChange(e.target.value as Interval)}
        className="rounded-md border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="day">Day</option>
        <option value="hour">Hour</option>
      </select>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SiteAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [preset, setPreset] = useState<Preset>("30d");
  const [interval, setInterval] = useState<Interval>("day");
  const dateRange = useMemo(() => computeDateRange(preset, interval), [preset, interval]);
  const {
    data: overviewResponse,
    isLoading: overviewLoading,
    error: overviewError,
  } = useOverview(id, dateRange);

  const {
    data: timeseriesResponse,
    isLoading: timeseriesLoading,
    error: timeseriesError,
  } = useTimeseries(id, dateRange);

  const {
    data: pagesResponse,
    isLoading: pagesLoading,
    error: pagesError,
  } = useTopPages(id, dateRange);

  const {
    data: referrersResponse,
    isLoading: referrersLoading,
    error: referrersError,
  } = useReferrers(id, dateRange);

  const {
    data: devicesResponse,
    isLoading: devicesLoading,
    error: devicesError,
  } = useDevices(id, dateRange);

  const {
    data: geoResponse,
    isLoading: geoLoading,
    error: geoError,
  } = useGeo(id, dateRange);

  const {
    data: realtimeResponse,
    isLoading: realtimeLoading,
    error: realtimeError,
  } = useRealtime(id);

  return (
    <div className="space-y-8 p-1">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <DateRangeBar
          preset={preset}
          interval={interval}
          onPresetChange={setPreset}
          onIntervalChange={setInterval}
        />
      </div>

      <OverviewSection
        data={overviewResponse?.data}
        isLoading={overviewLoading}
        error={overviewError}
      />
      <TimeseriesSection
        data={timeseriesResponse?.data}
        isLoading={timeseriesLoading}
        error={timeseriesError}
      />

      <div className="grid grid-cols-2 gap-8">
        <PagesSection
          data={pagesResponse?.data}
          isLoading={pagesLoading}
          error={pagesError}
        />
        <ReferrersSection
          data={referrersResponse?.data}
          isLoading={referrersLoading}
          error={referrersError}
        />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <DevicesSection
          data={devicesResponse?.data}
          isLoading={devicesLoading}
          error={devicesError}
        />
        <GeoSection
          data={geoResponse?.data}
          isLoading={geoLoading}
          error={geoError}
        />
      </div>

      <RealtimeSection
        data={realtimeResponse?.data}
        isLoading={realtimeLoading}
        error={realtimeError}
      />
    </div>
  );
}
