"use client";

import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useOverview } from "@/hooks/useAnalytics";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultDateRange() {
  return {
    from: "2026-02-01",
    to: "2026-02-26",
  };
}

// ─── Mock data (non-overview endpoints not yet implemented) ───────────────────

const MOCK_TIMESERIES = [
  { time: "2026-03-05", pageviews: 1820, sessions: 540 },
  { time: "2026-03-06", pageviews: 2100, sessions: 620 },
  { time: "2026-03-07", pageviews: 1950, sessions: 580 },
  { time: "2026-03-08", pageviews: 2400, sessions: 710 },
  { time: "2026-03-09", pageviews: 2200, sessions: 680 },
  { time: "2026-03-10", pageviews: 2350, sessions: 701 },
  { time: "2026-03-11", pageviews: 2000, sessions: 470 },
];

const MOCK_PAGES = [
  { path: "/", pageviews: 5200 },
  { path: "/pricing", pageviews: 2100 },
  { path: "/docs", pageviews: 1800 },
  { path: "/blog/intro", pageviews: 1400 },
  { path: "/login", pageviews: 980 },
];

const MOCK_REFERRERS = [
  { referrer: "google.com", visitors: 2100 },
  { referrer: "twitter.com", visitors: 830 },
  { referrer: "github.com", visitors: 540 },
  { referrer: "(direct)", visitors: 400 },
  { referrer: "hackernews.com", visitors: 210 },
];

const MOCK_DEVICES = [
  { device: "Desktop", visitors: 2400 },
  { device: "Mobile", visitors: 1200 },
  { device: "Tablet", visitors: 272 },
];

const MOCK_GEO = [
  { country: "United States", visitors: 1800 },
  { country: "Germany", visitors: 540 },
  { country: "India", visitors: 420 },
  { country: "United Kingdom", visitors: 380 },
  { country: "Canada", visitors: 310 },
];

const MOCK_REALTIME = { activeVisitors: 7 };

// ─── Sub-sections ─────────────────────────────────────────────────────────────

type OverviewData = {
  totalPageviews: number;
  totalSessions: number;
  totalVisitors: number;
};

function OverviewSection({
  data,
  isLoading,
  error,
}: {
  data?: OverviewData;
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

function TimeseriesSection() {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Timeseries
      </h2>
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
              {MOCK_TIMESERIES.map((row) => (
                <tr key={row.time} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{row.time}</td>
                  <td className="px-4 py-2.5 text-right">
                    {row.pageviews.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {row.sessions.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}

function PagesSection() {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Pages
      </h2>
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
              {MOCK_PAGES.map((row) => (
                <tr key={row.path} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{row.path}</td>
                  <td className="px-4 py-2.5 text-right">
                    {row.pageviews.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}

function ReferrersSection() {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Referrers
      </h2>
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
              {MOCK_REFERRERS.map((row) => (
                <tr key={row.referrer} className="border-b last:border-0">
                  <td className="px-4 py-2.5 text-xs">{row.referrer}</td>
                  <td className="px-4 py-2.5 text-right">
                    {row.visitors.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}

function DevicesSection() {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Devices
      </h2>
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
              {MOCK_DEVICES.map((row) => (
                <tr key={row.device} className="border-b last:border-0">
                  <td className="px-4 py-2.5 text-xs">{row.device}</td>
                  <td className="px-4 py-2.5 text-right">
                    {row.visitors.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}

function GeoSection() {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Geo
      </h2>
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
              {MOCK_GEO.map((row) => (
                <tr key={row.country} className="border-b last:border-0">
                  <td className="px-4 py-2.5 text-xs">{row.country}</td>
                  <td className="px-4 py-2.5 text-right">
                    {row.visitors.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}

function RealtimeSection() {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Realtime
      </h2>
      <Card className="py-0">
        <CardContent className="p-4 flex items-center gap-3">
          <span className="size-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm">
            <span className="text-2xl font-bold">
              {MOCK_REALTIME.activeVisitors}
            </span>{" "}
            active visitors right now
          </span>
        </CardContent>
      </Card>
    </section>
  );
}

// ─── Date range bar ───────────────────────────────────────────────────────────

function DateRangeBar() {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground">Range:</label>
      <select className="rounded-md border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
        <option>Last 7 days</option>
        <option>Last 30 days</option>
        <option>Last 90 days</option>
        <option>Custom</option>
      </select>
      <label className="text-xs text-muted-foreground ml-2">Interval:</label>
      <select className="rounded-md border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
        <option>Day</option>
        <option>Hour</option>
      </select>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SiteAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const dateRange = getDefaultDateRange();
  const {
    data: overviewResponse,
    isLoading: overviewLoading,
    error: overviewError,
  } = useOverview(id, dateRange);

  return (
    <div className="space-y-8 p-1">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <DateRangeBar />
      </div>

      <OverviewSection
        data={overviewResponse?.data}
        isLoading={overviewLoading}
        error={overviewError}
      />
      <TimeseriesSection />

      <div className="grid grid-cols-2 gap-8">
        <PagesSection />
        <ReferrersSection />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <DevicesSection />
        <GeoSection />
      </div>

      <RealtimeSection />
    </div>
  );
}
