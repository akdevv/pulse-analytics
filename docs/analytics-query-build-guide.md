# Pulse Analytics — Analytics Query API Build Guide

A step-by-step guide to building the read side of Pulse Analytics: TimescaleDB, the query API, the analytics dashboard, and session intelligence. One small piece at a time. Every step has a visible outcome so you can see the impact before moving on.

---

## A note before you start — read this first

**Your code does not need to be perfect right now. It just needs to work and work fast.**

This phase of the project is still learning-and-building mode. That means:

- It is completely fine to have leftover `console.log` statements, stale comments, debug code, and half-formed ideas sitting in files. That is what development looks like. Clean code is not written in one go — it is the result of refactoring after something works.
- Do not let folder structure block you. If a function ends up in the "wrong" file, that is fine. You can reorganize everything later in one dedicated pass. Right now reorganizing is a distraction, not a contribution.
- Your only three priorities in this phase are: **learn the concept**, **make it functional**, **make it fast**. In that order. Perfection is not on the list yet.

You will do a full cleanup pass after core features are working. That pass will be 10x faster and smarter because you will understand the system by then. Trust the process.

---

## How to use this guide

- **Never skip steps.** Each step builds directly on the previous one.
- **Verify before moving on.** Every step has a "how to verify" note.
- **Small steps only.** If a step feels too big, break it down further.
- **Understand before adding complexity.** Feel the problem first. Then add the solution.

---

## Where you are right now

You have a working ingestion pipeline. Events come in via `/track`, get validated, get enriched (UA, GeoIP), get queued, and eventually land in the database. The write side is solid.

But the data sitting in your database is completely dark. You cannot see it, query it meaningfully, or display it anywhere. That is what this entire guide fixes.

The journey from here:

1. **TimescaleDB** — understand why regular Postgres is not enough for analytics at scale, then convert your events table into a time-series hypertable
2. **Analytics Query API** — build the read-side Express endpoints that turn raw events into meaningful stats
3. **Redis caching on the read side** — make those queries instant for the dashboard
4. **Frontend analytics dashboard** — wire everything into charts and cards the user can actually see
5. **Session tracking and intelligence** — bounce rate, session duration, user journeys

---

## Phase 1 — Understand the Problem with Plain Postgres

> Goal: Feel the performance problem that TimescaleDB solves. Don't add any new technology yet. Just observe.

### 1.1 — Count how many events you have

- Open your DB client (psql, TablePlus, DBeaver — whatever you use)
- Run: `SELECT COUNT(*) FROM events;`
- Run: `SELECT COUNT(*) FROM events WHERE "createdAt" > NOW() - INTERVAL '24 hours';`
- **Verify:** You get numbers back. Note how long both queries take (check the query time in your client).
- **Why this matters:** Right now with a few hundred or few thousand rows, both are instant. Keep that number in mind. It is about to become relevant.

### 1.2 — Seed a meaningful amount of fake data

- Write a quick seed script (a plain `.ts` file you run once with `ts-node`) that inserts 500,000 fake events spread across the last 30 days
- Vary the `page_path`, `browser`, `country`, and `session_id` fields with random values from a small list so the data looks realistic
- Spread timestamps randomly across 30 days so it is not all the same second
- Run the script and let it finish. It will take a minute or two.
- **Verify:** `SELECT COUNT(*) FROM events;` returns ~500,000 rows

### 1.3 — Run a real analytics query and feel the pain

- Now run the kind of query the dashboard will actually need:

```sql
SELECT
  DATE_TRUNC('hour', "createdAt") AS hour,
  COUNT(*) AS pageviews,
  COUNT(DISTINCT "sessionId") AS sessions
FROM events
WHERE
  "siteId" = 'your-site-id-here'
  AND "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour ASC;
```

- Check the query execution time
- Then run `EXPLAIN ANALYZE` in front of it and read the output — look for "Seq Scan" which means it scanned every single row
- **Observe:** With 500k rows this might take 300–800ms. Now imagine 50 million rows. That is your production reality. This is the problem.
- **Why this matters:** You now understand *why* TimescaleDB exists. It is not just another database — it solves exactly this problem. Understanding the pain makes the solution stick.

### 1.4 — Run a top-pages query

```sql
SELECT
  "urlPathname",
  COUNT(*) AS pageviews
FROM events
WHERE
  "siteId" = 'your-site-id-here'
  AND "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY "urlPathname"
ORDER BY pageviews DESC
LIMIT 10;
```

- Note the time. Run `EXPLAIN ANALYZE` on this too.
- **Observe:** Another slow sequential scan. Every dashboard query will look like this without proper time-series indexing.

---

## Phase 2 — Set Up TimescaleDB

> Goal: Convert your events table into a TimescaleDB hypertable. Understand what that actually means and see the query speed difference.

### 2.1 — Understand what TimescaleDB actually is (read this before touching anything)

TimescaleDB is a PostgreSQL extension. It is not a separate database — it runs inside your existing Postgres instance. You keep using the same connection string, the same Prisma client, the same SQL. What it adds is one concept: **hypertables**.

A hypertable looks like a normal table but under the hood TimescaleDB automatically partitions it into **chunks** by time. Instead of one massive table with 50 million rows, you have hundreds of smaller tables each covering a time window (e.g. one week of data). When you query `WHERE createdAt > NOW() - INTERVAL '7 days'`, Postgres only has to look at the relevant chunks — not the entire history. This is called **chunk exclusion** and it is what makes time-series queries fast.

Key things to understand:
- Hypertables are still just Postgres tables. Your existing queries work unchanged.
- The time column becomes the partition key. Every query that filters on time gets faster automatically.
- Indexes are created per-chunk, so they stay small and fast even as data grows.
- This is exactly what Plausible Analytics, Umami, and most analytics systems use in production.

### 2.2 — Enable the TimescaleDB extension

- Connect to your database and run:

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

- **Verify:** Run `SELECT * FROM pg_extension WHERE extname = 'timescaledb';` — you should see a row. If you get an error, TimescaleDB is not installed on your Postgres instance — check your `docker-compose.yml` and make sure you are using the `timescale/timescaledb` image, not plain `postgres`.

### 2.3 — Understand the migration problem

You already have an `events` table with data in it. Converting it to a hypertable has one requirement: the time column must have no duplicate primary key violations when partitioned, and the table must not already have data that violates chunk boundaries. In practice, you need to run this migration carefully.

There are two options. For local dev with fake seed data: drop and recreate. For production with real data: use `create_hypertable` with `migrate_data => true`. We will do the clean local approach first since you are still in dev.

### 2.4 — Convert the events table to a hypertable

- If you are comfortable losing your seed data (you will re-seed it): run the migration directly
- Create a new SQL migration file (or run manually in your client):

```sql
-- Convert existing events table to hypertable
-- This tells TimescaleDB to partition by the createdAt column
-- chunk_time_interval = 1 day means each chunk covers one day of data
SELECT create_hypertable(
  'events',
  'createdAt',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);
```

- **Verify:** Run `SELECT * FROM timescaledb_information.hypertables;` — you should see your `events` table listed

### 2.5 — Re-run the seed script and check chunk creation

- Run your seed script again to repopulate 500k events across 30 days
- After seeding, run:

```sql
SELECT
  chunk_name,
  range_start,
  range_end,
  pg_size_pretty(total_bytes) AS size
FROM timescaledb_information.chunks
WHERE hypertable_name = 'events'
ORDER BY range_start;
```

- **Verify:** You should see ~30 rows — one chunk per day. Each chunk is a small self-contained table internally. This is the partitioning in action.

### 2.6 — Add the right indexes

- Right now even with hypertables, queries filtering by `siteId` still need a good index. Run:

```sql
-- The most important index: site + time, which covers almost every dashboard query
CREATE INDEX IF NOT EXISTS idx_events_site_time
  ON events ("siteId", "createdAt" DESC);

-- For page-level queries
CREATE INDEX IF NOT EXISTS idx_events_site_path_time
  ON events ("siteId", "urlPathname", "createdAt" DESC);

-- For session queries
CREATE INDEX IF NOT EXISTS idx_events_session_time
  ON events ("sessionId", "createdAt" DESC);
```

- **Verify:** Indexes are created (check in your DB client under indexes for the events table)

### 2.7 — Re-run the slow queries from Phase 1 and compare

- Run the exact same hourly pageview query from step 1.3
- Run `EXPLAIN ANALYZE` on it again
- **Observe:** You should now see "Index Scan" instead of "Seq Scan" and the execution time should be dramatically lower — often 10–50x faster. This is the point. Write down both numbers somewhere. This is a real data point you can talk about in interviews.

### 2.8 — Set up a data retention policy (understand it, don't skip it)

TimescaleDB can automatically drop old data based on age. For analytics, you probably want raw events for 90 days and then rely on aggregates for history. This is how production analytics systems keep storage under control.

```sql
-- Automatically drop chunks older than 90 days
SELECT add_retention_policy('events', INTERVAL '90 days');
```

- **Verify:** Run `SELECT * FROM timescaledb_information.jobs;` — you should see the retention job listed
- **Why this matters:** Without this, your events table grows forever. In production at 10k RPS that is roughly 864 million events per day. Retention policies are non-negotiable at scale.

### 2.9 — Set up compression (understand it, enable it)

TimescaleDB can compress older chunks to save disk space. Compressed chunks use 90–95% less space and are still queryable.

```sql
-- Enable compression on the hypertable
ALTER TABLE events SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = '"siteId"'
);

-- Automatically compress chunks older than 7 days
SELECT add_compression_policy('events', INTERVAL '7 days');
```

- **Verify:** Run `SELECT * FROM timescaledb_information.jobs;` — see both the retention and compression jobs listed

---

## Phase 3 — Continuous Aggregates (Pre-computed Rollups)

> Goal: Understand why querying raw events for every dashboard request is still too slow at scale, then build pre-computed aggregates that make dashboard queries instant.

### 3.1 — Understand the concept before building

Right now every dashboard query scans raw events. Even with hypertables and indexes, a query like "show me hourly pageviews for the last 30 days across this site" still needs to process millions of rows on every request.

**Continuous aggregates** are TimescaleDB's solution. They are a materialized view that automatically stays up to date as new data arrives. You define the aggregation once, and TimescaleDB refreshes it in the background. Dashboard queries then hit the aggregate instead of raw events — going from scanning millions of rows to scanning hundreds.

The pattern for analytics systems is usually:
- Raw events: stored in hypertable, queried rarely
- Hourly aggregates: pre-computed, used for most dashboard queries
- Daily aggregates: pre-computed, used for date-range queries spanning weeks/months

### 3.2 — Create the hourly pageviews aggregate

```sql
CREATE MATERIALIZED VIEW hourly_pageviews
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', "createdAt") AS bucket,
  "siteId",
  "urlPathname",
  "browser",
  "os",
  "device",
  "country",
  COUNT(*) AS pageviews,
  COUNT(DISTINCT "sessionId") AS sessions,
  COUNT(DISTINCT "visitorId") AS visitors
FROM events
WHERE "eventType" = 'PAGEVIEW'
GROUP BY bucket, "siteId", "urlPathname", "browser", "os", "device", "country"
WITH NO DATA;
```

- The `WITH NO DATA` means it does not backfill yet — we will do that next
- **Verify:** Run `SELECT * FROM timescaledb_information.continuous_aggregates;` — you should see `hourly_pageviews` listed

### 3.3 — Backfill the aggregate with existing data

```sql
CALL refresh_continuous_aggregate(
  'hourly_pageviews',
  NOW() - INTERVAL '30 days',
  NOW()
);
```

- This will take a minute — it is processing all 500k rows
- **Verify:** `SELECT COUNT(*) FROM hourly_pageviews;` — you should see many fewer rows than raw events (one row per hour per site per page, not one per event)

### 3.4 — Set up automatic refresh

```sql
SELECT add_continuous_aggregate_policy(
  'hourly_pageviews',
  start_offset => INTERVAL '3 hours',
  end_offset   => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);
```

- This tells TimescaleDB to refresh the last 3 hours of data every hour automatically, picking up any new events
- **Verify:** `SELECT * FROM timescaledb_information.jobs;` — see the refresh policy job

### 3.5 — Create the daily pageviews aggregate

```sql
CREATE MATERIALIZED VIEW daily_pageviews
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', bucket) AS day,
  "siteId",
  "urlPathname",
  "browser",
  "os",
  "device",
  "country",
  SUM(pageviews) AS pageviews,
  SUM(sessions) AS sessions,
  SUM(visitors) AS visitors
FROM hourly_pageviews
GROUP BY day, "siteId", "urlPathname", "browser", "os", "device", "country"
WITH NO DATA;
```

- Notice: this is built on top of `hourly_pageviews`, not on raw events. This is called **rollup on rollup** and is a very efficient pattern.

```sql
-- Backfill
CALL refresh_continuous_aggregate(
  'daily_pageviews',
  NOW() - INTERVAL '30 days',
  NOW()
);

-- Auto-refresh policy
SELECT add_continuous_aggregate_policy(
  'daily_pageviews',
  start_offset => INTERVAL '3 days',
  end_offset   => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day'
);
```

- **Verify:** `SELECT COUNT(*) FROM daily_pageviews;` — even fewer rows. One per day per site per page.

### 3.6 — Query the aggregate and compare to raw

- Run the same hourly query from Phase 1 but this time against `hourly_pageviews` instead of `events`:

```sql
SELECT
  bucket AS hour,
  SUM(pageviews) AS pageviews,
  SUM(sessions) AS sessions
FROM hourly_pageviews
WHERE
  "siteId" = 'your-site-id-here'
  AND bucket >= NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour ASC;
```

- **Observe:** This should be nearly instant — single-digit milliseconds even with lots of data. The heavy aggregation work was done once in the background, not on every request. This is the pattern that makes production analytics dashboards fast.

---

## Phase 4 — Analytics Query API (The Read Side)

> Goal: Build the Express endpoints that the frontend dashboard will call. These endpoints read from your aggregates and return clean JSON.

### 4.1 — Understand the architecture before building

The analytics query API is a separate concern from the ingestion API. Ingestion is optimized for write throughput — return 204 as fast as possible. The query API is optimized for read quality — return accurate, pre-aggregated data efficiently.

The endpoints you will build:
- `GET /analytics/:siteId/overview` — total pageviews, sessions, visitors for a date range
- `GET /analytics/:siteId/timeseries` — hourly or daily breakdown over time (for the line chart)
- `GET /analytics/:siteId/pages` — top pages by pageviews (for the bar chart / table)
- `GET /analytics/:siteId/referrers` — top referrer sources
- `GET /analytics/:siteId/devices` — browser, OS, device type breakdown
- `GET /analytics/:siteId/geo` — country breakdown
- `GET /analytics/:siteId/realtime` — active visitors in the last 5 minutes (hits raw events, not aggregates)

All of these require the user to own the site they are querying — you need an auth middleware check.

### 4.2 — Create the analytics route skeleton

- Create `analytics.routes.ts` with all seven routes returning hardcoded empty responses for now
- Mount it in your core API server at `/api/analytics`
- Protect every route with your existing JWT `authenticate` middleware
- **Verify:** Hit `GET /api/analytics/some-site-id/overview` with a valid JWT → get `200` with `{}`. Without JWT → get `401`.

### 4.3 — Add the site ownership check

Before returning any analytics data, you must verify the requesting user owns the site. This is a security requirement, not optional.

- In `analytics.service.ts`, create `verifySiteOwnership(siteId, userId)` that queries Prisma: `site.findFirst({ where: { id: siteId, userId } })`
- If no site found, throw a 403 error
- Call this at the start of every controller action
- **Verify:** Log in as User A, try to query a site belonging to User B → get `403`. Query your own site → get through.

### 4.4 — Add query param parsing

All analytics endpoints accept common query parameters. Parse them once and reuse.

- Create `analytics.types.ts` with a Zod schema for the common params:

```typescript
const AnalyticsQuerySchema = z.object({
  from: z.string().optional(),   // ISO date string, e.g. "2024-01-01"
  to: z.string().optional(),     // ISO date string
  interval: z.enum(['hour', 'day']).default('day'),
  limit: z.coerce.number().min(1).max(100).default(10),
});
```

- Parse this in the controller and pass the parsed values down to the service
- Default `from` to 7 days ago and `to` to now if not provided
- **Verify:** Hit the endpoint with `?from=2024-01-01&interval=hour` → log the parsed params → see them correctly typed

### 4.5 — Build the overview endpoint

The overview endpoint returns aggregate totals for the entire date range. It is the stat cards at the top of the dashboard.

- In `analytics.repository.ts`, write `getOverview(siteId, from, to)`:

```sql
SELECT
  SUM(pageviews) AS total_pageviews,
  SUM(sessions) AS total_sessions,
  SUM(visitors) AS total_visitors
FROM daily_pageviews
WHERE
  "siteId" = $1
  AND day >= $2
  AND day < $3
```

- Return the result as `{ pageviews: number, sessions: number, visitors: number }`
- Wire it into the controller
- **Verify:** Hit `GET /api/analytics/:siteId/overview?from=2024-01-01&to=2024-02-01` → see real numbers that match what you seeded

### 4.6 — Build the timeseries endpoint

This is the data for the line chart — pageviews per hour or per day.

- Write `getTimeseries(siteId, from, to, interval)` in the repository
- If `interval === 'hour'`, query `hourly_pageviews`; if `interval === 'day'`, query `daily_pageviews`
- Return an array of `{ time: string, pageviews: number, sessions: number }`

```sql
-- For daily interval
SELECT
  day AS time,
  SUM(pageviews) AS pageviews,
  SUM(sessions) AS sessions
FROM daily_pageviews
WHERE "siteId" = $1 AND day >= $2 AND day < $3
GROUP BY day
ORDER BY day ASC
```

- **Verify:** Hit the endpoint → get an array of objects with dates and counts → the count should match your seed data pattern

### 4.7 — Build the top pages endpoint

- Write `getTopPages(siteId, from, to, limit)` in the repository:

```sql
SELECT
  "urlPathname" AS path,
  SUM(pageviews) AS pageviews,
  SUM(sessions) AS sessions
FROM daily_pageviews
WHERE "siteId" = $1 AND day >= $2 AND day < $3
GROUP BY "urlPathname"
ORDER BY pageviews DESC
LIMIT $4
```

- **Verify:** Hit the endpoint → see a ranked list of your seeded page paths with their view counts

### 4.8 — Build the referrers endpoint

- Same pattern as top pages but group by referrer
- Your events table has a `referrer` column (from the `dr` param the SDK sends)
- **Note:** Referrer data lives in raw events, not in your current aggregates. You have two options: add referrer to your aggregates (cleaner, do this), or query raw events for it (easier for now). Start with raw events, add it to aggregates later.

```sql
SELECT
  COALESCE(NULLIF(referrer, ''), 'Direct') AS source,
  COUNT(*) AS pageviews
FROM events
WHERE "siteId" = $1 AND "createdAt" >= $2 AND "createdAt" < $3
  AND "eventType" = 'PAGEVIEW'
GROUP BY referrer
ORDER BY pageviews DESC
LIMIT $4
```

- **Verify:** Hit the endpoint → see referrer sources. Most will be "Direct" since your seed data probably doesn't have realistic referrers.

### 4.9 — Build the devices endpoint

- Group by browser, OS, and device type from daily_pageviews (since you already have those columns in the aggregate)
- Return three separate breakdowns: browsers, operating systems, device types

```sql
-- Browser breakdown
SELECT
  "browser",
  SUM(pageviews) AS pageviews
FROM daily_pageviews
WHERE "siteId" = $1 AND day >= $2 AND day < $3
GROUP BY "browser"
ORDER BY pageviews DESC

-- OS breakdown
SELECT "os", SUM(pageviews) AS pageviews
FROM daily_pageviews
WHERE "siteId" = $1 AND day >= $2 AND day < $3
GROUP BY "os"
ORDER BY pageviews DESC

-- Device breakdown
SELECT "device", SUM(pageviews) AS pageviews
FROM daily_pageviews
WHERE "siteId" = $1 AND day >= $2 AND day < $3
GROUP BY "device"
ORDER BY pageviews DESC
```

- Run all three queries and return them as `{ browsers: [...], os: [...], devices: [...] }`
- **Verify:** Hit the endpoint → see three arrays with realistic browser/OS/device data from your seed

### 4.10 — Build the geo endpoint

- Group by country from daily_pageviews

```sql
SELECT
  "country",
  SUM(pageviews) AS pageviews
FROM daily_pageviews
WHERE "siteId" = $1 AND day >= $2 AND day < $3
  AND "country" IS NOT NULL
GROUP BY "country"
ORDER BY pageviews DESC
LIMIT 20
```

- **Verify:** Hit the endpoint → see country codes and their pageview counts

### 4.11 — Build the realtime endpoint

This one is different — it does NOT use aggregates. You need to know who is on the site *right now*, and aggregates only update hourly or daily.

- Query raw events for the last 5 minutes:

```sql
SELECT COUNT(DISTINCT "sessionId") AS active_sessions
FROM events
WHERE
  "siteId" = $1
  AND "createdAt" >= NOW() - INTERVAL '5 minutes'
  AND "eventType" = 'PAGEVIEW'
```

- Also return the top active pages in the last 5 minutes:

```sql
SELECT
  "urlPathname" AS path,
  COUNT(DISTINCT "sessionId") AS active_sessions
FROM events
WHERE "siteId" = $1
  AND "createdAt" >= NOW() - INTERVAL '5 minutes'
  AND "eventType" = 'PAGEVIEW'
GROUP BY "urlPathname"
ORDER BY active_sessions DESC
LIMIT 5
```

- **Verify:** Open your test frontend, load a few pages, then hit this endpoint within 5 minutes → see the active session count and pages

---

## Phase 5 — Redis Caching on the Read Side

> Goal: Stop the database from getting hammered every time someone looks at their dashboard. Cache query results in Redis.

### 5.1 — Understand the problem first

Think about the dashboard of a site that gets moderate traffic. The dashboard auto-refreshes every 30 seconds. If 10 users have the dashboard open simultaneously, that is 10 requests × 7 endpoints × 2 calls per minute = 140 database queries per minute just for one site. Now imagine 1,000 sites. The read side needs caching just as much as the write side did.

### 5.2 — Understand how read-side caching is different

On the ingestion side you cached the site lookup — a single Redis GET per request to avoid a DB query. On the query side, you are caching entire query results — JSON arrays of aggregated data.

The key insight about TTL strategy:
- Realtime endpoint: short TTL (30 seconds) — data changes frequently
- Overview and timeseries: medium TTL (1–2 minutes) — aggregates refresh every hour anyway
- Top pages, referrers, devices, geo: longer TTL (5 minutes) — these change slowly

### 5.3 — Create the analytics cache module

- Create `analytics.cache.ts`
- Write a generic `getCached<T>(key: string, ttl: number, fetchFn: () => Promise<T>): Promise<T>` function
- It checks Redis first, calls `fetchFn` on miss, stores the result with TTL, returns the data
- Log `"analytics cache HIT: key"` and `"analytics cache MISS: key"` so you can watch it work

```typescript
async function getCached<T>(key: string, ttl: number, fetchFn: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    console.log('analytics cache HIT:', key);
    return JSON.parse(cached) as T;
  }
  console.log('analytics cache MISS:', key);
  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}
```

- **Verify:** Call it twice with the same key → first call hits DB and logs MISS, second call logs HIT

### 5.4 — Build cache keys with a consistent naming convention

Cache keys need to encode everything that makes the query unique: site ID, date range, interval, limit. If the key misses any parameter, you will return wrong cached data to different users.

Convention: `analytics:{siteId}:{endpoint}:{from}:{to}:{interval}:{limit}`

Example: `analytics:abc123:overview:2024-01-01:2024-02-01:day:10`

- Create `buildCacheKey(siteId, endpoint, params)` helper that builds this string
- **Verify:** Log the cache key for a few different requests — make sure different date ranges produce different keys

### 5.5 — Wrap every repository call with the cache

- In each service method, wrap the repository call with `getCached`:

```typescript
async function getOverview(siteId, from, to) {
  const key = buildCacheKey(siteId, 'overview', { from, to });
  return getCached(key, 120, () => analyticsRepository.getOverview(siteId, from, to));
}
```

- TTL recommendations: overview → 120s, timeseries → 120s, pages → 300s, referrers → 300s, devices → 300s, geo → 300s, realtime → 30s
- **Verify:** Hit any endpoint twice in succession → see HIT on the second call → measure the response time difference (should be <2ms cached vs 10–50ms uncached)

### 5.6 — Understand cache invalidation for analytics

Unlike the ingestion side where you actively invalidated the cache when a site changed, analytics caches just expire naturally via TTL. This is fine because:
- The underlying data (aggregates) only changes every hour anyway
- A 2-minute stale dashboard is completely acceptable for an analytics product
- Active invalidation would be complex and provide minimal benefit

You do not need to build cache invalidation logic for the analytics query API. TTL expiry is the correct strategy here. Write this understanding down — it is a real system design decision you can explain.

---

## Phase 6 — Frontend Analytics Dashboard

> Goal: Build the dashboard UI that visualizes everything you just built. Charts, stat cards, date pickers, auto-refresh.

### 6.1 — Plan the layout before writing any code

Open a blank document or piece of paper and sketch the dashboard layout:
- Top: site selector dropdown (if user has multiple sites), date range picker
- Row 1: four stat cards — Total Pageviews, Total Sessions, Unique Visitors, and one more (bounce rate when you build sessions)
- Row 2: line chart spanning full width — pageviews over time
- Row 3 left: top pages table. Row 3 right: top referrers table
- Row 4 left: device/browser breakdown. Row 4 right: geo/country breakdown

Knowing the layout before writing components saves a lot of back-and-forth.

### 6.2 — Create the analytics API client

- In your frontend `lib/` folder, create `analytics.api.ts`
- Write typed fetch functions for every endpoint you built:

```typescript
async function getOverview(siteId: string, params: QueryParams): Promise<OverviewStats> {
  const qs = new URLSearchParams({ from: params.from, to: params.to });
  const res = await fetch(`/api/analytics/${siteId}/overview?${qs}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch overview');
  return res.json();
}
```

- Write one function per endpoint: `getOverview`, `getTimeseries`, `getTopPages`, `getReferrers`, `getDevices`, `getGeo`, `getRealtime`
- **Verify:** Call `getOverview` from a browser console or a test component → see real data from your API

### 6.3 — Set up TanStack Query for data fetching

- Install `@tanstack/react-query`
- Wrap your app in `QueryClientProvider`
- Create custom hooks for each endpoint:

```typescript
function useOverview(siteId: string, params: QueryParams) {
  return useQuery({
    queryKey: ['overview', siteId, params.from, params.to],
    queryFn: () => analyticsApi.getOverview(siteId, params),
    staleTime: 60_000,       // Consider data fresh for 1 minute
    refetchInterval: 30_000, // Auto-refresh every 30 seconds
  });
}
```

- **Verify:** Use the hook in a component, check React Query DevTools → see the query, its status, its data, and the refetch timer counting down

### 6.4 — Build the date range picker

- Build a simple date range picker component with preset options: Today, Last 7 days, Last 30 days, Last 90 days, and a custom range
- Store the selected range in URL search params (not local state) so users can share links to specific date ranges
- When the date range changes, all hooks automatically refetch because the `queryKey` changes
- **Verify:** Change the date range → all queries refetch → data updates to match the new range

### 6.5 — Build the stat cards

- Four cards: Pageviews, Sessions, Visitors, and a placeholder for Bounce Rate (you will fill this in Phase 7)
- Show a loading skeleton while data is fetching — do not show empty boxes
- Show the actual number once loaded, formatted nicely (e.g. `1,234,567` not `1234567`)
- **Verify:** Load the dashboard → see skeleton states → see real numbers appear. Change the date range → skeletons appear briefly → new numbers appear.

### 6.6 — Build the timeseries line chart

- Install `recharts` (it is already in your stack)
- Create a `TimeseriesChart` component that takes an array of `{ time: string, pageviews: number }` and renders a line chart
- Use `ResponsiveContainer` so the chart fills its parent width
- Show the date/time on the X axis formatted nicely (e.g. "Jan 5" for daily, "2pm" for hourly)
- **Verify:** See the chart render with real data. Hover over data points → see a tooltip with the exact values. Resize the browser → chart adapts.

### 6.7 — Build the top pages table

- Simple table component: rank, page path, pageview count
- Truncate long paths with ellipsis if they do not fit
- Make each path a link (opens in new tab) if you can reconstruct the full URL from the site's domain
- **Verify:** See ranked pages with counts. If you have realistic seed data, the ranking should look like a real website's analytics.

### 6.8 — Build the referrers table

Same structure as top pages table. The only difference: a source of "Direct" should display as "(direct / none)" to match how analytics tools conventionally display direct traffic.

### 6.9 — Build the device breakdown

- Three small sections: Browsers, Operating Systems, Device Types
- For each, show a simple list with a visual bar showing relative proportion (not a full chart — just a colored bar behind the row that is `width: X%` where X is the percentage of total)
- **Verify:** See three lists with relative proportions. Should add up visually.

### 6.10 — Build the geo breakdown

- Simple table: country flag emoji (you can derive this from the 2-letter country code), country name, pageview count
- Country code to name mapping: use a small static JSON object with the top 50 countries — you do not need a full library for this
- **Verify:** See a ranked list of countries. Flags make it look immediately professional.

### 6.11 — Add the realtime widget

- Small widget in the top-right area of the dashboard: "X people on your site right now"
- This auto-refreshes every 30 seconds (TanStack Query `refetchInterval`)
- Below the count, show the top 3 active pages right now
- Use a pulsing green dot animation next to the count to signal "live"
- **Verify:** Load your test site in another tab → come back to dashboard → within 30 seconds see the count go up

### 6.12 — Wire up error states

- Every data-fetching hook can fail. The dashboard should handle this gracefully.
- If overview fails, show an error card instead of crashing the whole page
- Each section should be independently wrapped in a try/catch — a failing geo endpoint should not hide the timeseries chart
- **Verify:** Temporarily break the overview endpoint → see an error state in just that card, everything else still loads

---

## Phase 7 — Session Tracking and Bounce Rate

> Goal: Understand what a "session" really is in analytics, then compute bounce rate, session duration, and entry/exit pages.

### 7.1 — Understand sessions before building anything

In traditional analytics, a session is a group of pageviews from the same visitor within a 30-minute window. If a visitor goes 30+ minutes without any activity, the next pageview starts a new session.

Your SDK already generates a `sessionId` per tab (stored in `sessionStorage`). Every pageview from that tab carries the same session ID. This means you already have session data — you just are not computing anything from it yet.

Key session metrics:
- **Bounce rate**: percentage of sessions with only 1 pageview. A "bounce" is someone who lands and immediately leaves.
- **Session duration**: time between the first and last event in a session. If there is only 1 event, duration is 0 (or unknown).
- **Pages per session**: count of distinct pageviews in a session.
- **Entry page**: the first page viewed in a session.
- **Exit page**: the last page viewed in a session.

None of this requires new data collection. It is all derivable from events you already have.

### 7.2 — Write a query to compute session-level stats

- Write a query that groups events by `sessionId` and computes session properties:

```sql
SELECT
  "sessionId",
  "siteId",
  MIN("createdAt") AS session_start,
  MAX("createdAt") AS session_end,
  COUNT(*) AS pageview_count,
  EXTRACT(EPOCH FROM (MAX("createdAt") - MIN("createdAt"))) AS duration_seconds
FROM events
WHERE "siteId" = $1
  AND "createdAt" >= $2
  AND "createdAt" < $3
  AND "eventType" = 'PAGEVIEW'
GROUP BY "sessionId", "siteId"
ORDER BY session_start DESC
```

- Run this manually in your DB client
- **Observe:** Each row is a session. Sessions with `pageview_count = 1` are bounces. Sessions with `duration_seconds = 0` are single-page visits.

### 7.3 — Compute bounce rate

- Add `getBounceRate(siteId, from, to)` to `analytics.repository.ts`:

```sql
SELECT
  COUNT(*) FILTER (WHERE pageview_count = 1) AS bounced_sessions,
  COUNT(*) AS total_sessions,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE pageview_count = 1) / NULLIF(COUNT(*), 0),
    1
  ) AS bounce_rate_pct
FROM (
  SELECT "sessionId", COUNT(*) AS pageview_count
  FROM events
  WHERE "siteId" = $1
    AND "createdAt" >= $2
    AND "createdAt" < $3
    AND "eventType" = 'PAGEVIEW'
  GROUP BY "sessionId"
) AS sessions
```

- Add this to the overview endpoint so bounce rate is returned alongside pageviews/sessions/visitors
- Fill in the fourth stat card in the dashboard
- **Verify:** See a realistic bounce rate percentage (typically 40–70% for most sites). If your seed data is random it might be very high, which is expected.

### 7.4 — Compute average session duration

```sql
SELECT
  AVG(duration_seconds) AS avg_duration_seconds
FROM (
  SELECT
    "sessionId",
    EXTRACT(EPOCH FROM (MAX("createdAt") - MIN("createdAt"))) AS duration_seconds
  FROM events
  WHERE "siteId" = $1
    AND "createdAt" >= $2
    AND "createdAt" < $3
    AND "eventType" = 'PAGEVIEW'
  GROUP BY "sessionId"
  HAVING COUNT(*) > 1  -- Exclude single-page sessions (duration is meaningless)
) AS session_durations
```

- Add to the overview response as `avgSessionDurationSeconds`
- Format it nicely in the frontend: `"2m 34s"` not `"154 seconds"`
- Add a fifth stat card for this, or replace the placeholder you had

### 7.5 — Compute entry and exit pages

Entry and exit pages are valuable for understanding where people start their journey and where they leave from.

```sql
-- Entry pages (first page of each session)
SELECT
  first_page AS path,
  COUNT(*) AS sessions
FROM (
  SELECT DISTINCT ON ("sessionId")
    "sessionId",
    "urlPathname" AS first_page
  FROM events
  WHERE "siteId" = $1
    AND "createdAt" >= $2
    AND "createdAt" < $3
    AND "eventType" = 'PAGEVIEW'
  ORDER BY "sessionId", "createdAt" ASC
) AS entry_events
GROUP BY first_page
ORDER BY sessions DESC
LIMIT $4
```

For exit pages, same query but `ORDER BY "sessionId", "createdAt" DESC`.

- Add a new `/entry-pages` and `/exit-pages` endpoint, or add them to the existing pages endpoint as separate keys
- Add them to the dashboard — you can add a toggle on the top pages table to switch between "All Pages", "Entry Pages", "Exit Pages"

### 7.6 — Update the overview to use the aggregate where possible

You are now running several subqueries against raw events for session stats. At low data volumes this is fine. But for bounce rate and session duration you want to make sure these are fast:

- Add a composite index to help session queries:

```sql
CREATE INDEX IF NOT EXISTS idx_events_session_site_time
  ON events ("siteId", "sessionId", "createdAt");
```

- Add `EXPLAIN ANALYZE` to your session queries and verify they use this index
- **Verify:** Bounce rate query with 500k rows should run in under 50ms

---

## Phase 8 — Wire the Frontend to Real Data End to End

> Goal: Everything you built should work together. A user logs in, registers a site, embeds the SDK, and sees real data in their dashboard.

### 8.1 — Test the full user journey manually

Do this step-by-step with a real browser, not seed data:

1. Register a new account in your frontend
2. Create a new site
3. Copy the SDK snippet from the site page
4. Create a simple `test.html` file locally and paste the snippet in
5. Open `test.html` in a browser (serve it with a simple `npx serve .` if needed to avoid CORS)
6. Navigate around — open a few different "pages" by changing the hash
7. Go to the dashboard for that site
8. **Verify:** See real pageviews appear within 30 seconds. See your own country in the geo breakdown. See your browser and OS in the devices breakdown. See the page you visited in top pages.

This end-to-end check is the most important verify in the entire guide. If this works, the system is real.

### 8.2 — Check the realtime widget with yourself

- After loading your test page, immediately go to the dashboard
- **Verify:** The realtime widget shows `1 person on your site right now`
- Wait 5 minutes, check again: `0 people on your site right now`

### 8.3 — Test the date range filter

- Change the date range to "Today"
- **Verify:** You see only the pageviews you generated today
- Change to "Last 7 days"
- **Verify:** Numbers go up (or stay the same if you started today)

### 8.4 — Test with multiple sites

- Create a second site in your account
- Embed the SDK for that site on a different test page
- Visit it a few times
- **Verify:** The dashboard for site 1 shows only site 1's data. The dashboard for site 2 shows only site 2's data. No cross-contamination.

### 8.5 — Test with a second user account

- Register a second account
- **Verify:** The second account cannot access the first account's site analytics — should get 403

---

## Phase 9 — Performance Check and Stress Test the Read Side

> Goal: Before moving on, make sure the query API is genuinely fast and can handle real load.

### 9.1 — Measure every endpoint baseline

- Use `curl -w "%{time_total}"` or add timing logs server-side
- Record the p95 response time for every endpoint with 500k rows in the DB:
  - Overview: target <50ms uncached, <5ms cached
  - Timeseries: target <50ms uncached, <5ms cached
  - Top pages: target <30ms uncached, <5ms cached
  - Realtime: target <30ms (always hits raw events, no aggregate)

Write these numbers down. They are your baseline before you add more data.

### 9.2 — Load test the query API with Artillery

- Install Artillery if you do not have it already
- Write a simple Artillery config that hits your analytics endpoints:

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 50
  defaults:
    headers:
      Authorization: 'Bearer your-jwt-token-here'
scenarios:
  - flow:
    - get:
        url: '/api/analytics/your-site-id/overview?from=2024-01-01&to=2024-02-01'
    - get:
        url: '/api/analytics/your-site-id/timeseries?from=2024-01-01&to=2024-02-01'
    - get:
        url: '/api/analytics/your-site-id/pages?from=2024-01-01&to=2024-02-01'
```

- Run it: `artillery run query-load-test.yml`
- **Observe:** After the first few requests warm the cache, p95 should drop to <5ms for most endpoints. If it does not, check your cache is actually being hit.

### 9.3 — Identify any slow queries and fix them

- Look at the Artillery report. Any endpoint consistently above 100ms needs attention.
- For any slow endpoint, run its query directly in the DB with `EXPLAIN ANALYZE`
- If you see "Seq Scan" on a large table, you are missing an index
- Add the index, verify the query plan changes to "Index Scan", re-measure

### 9.4 — Bump the seed data to 5 million rows and re-measure

- Update your seed script to insert 5 million events (or run it 10 times)
- Re-run the baseline measurement for each endpoint
- **Observe:** Cached endpoints should be completely unaffected — they are reading from Redis, not the DB. Uncached endpoints should still be fast because you are hitting aggregates, not raw events. Realtime endpoint will get slower because it always hits raw events — add a note that at very high data volumes you would move to a different architecture for realtime (e.g. Redis counters updated by the worker).

---

## Where You Are After This Guide

At the end of this guide you will have:

- TimescaleDB running with hypertables, continuous aggregates, compression, and retention policies
- A complete analytics query API with caching
- A fully functional analytics dashboard showing real data
- Session tracking, bounce rate, entry/exit pages
- End-to-end flow working: SDK → ingestion → worker → DB → query API → dashboard

**What comes next after this:**
1. Cleanup pass — refactor, remove dead code, add proper error handling, organize files properly
2. AWS deployment prep — Dockerfiles, environment configs, Terraform
3. Load testing at scale — Artillery / k6 to prove the system handles real traffic
4. CI/CD pipeline

**You are approximately 60% done with the project at the end of this guide.** The remaining 40% is deployment, infrastructure, observability, and load testing — all of which build on everything you built here.

---

## A final reminder

Your code does not need to be beautiful right now. It needs to work and it needs to be fast. If you have a `console.log` left in from three weeks ago, leave it. If a function is in the "wrong" file, leave it. If a variable is named `tmp2`, leave it. You will fix all of this in the cleanup pass, and you will do it better then because you will understand the system deeply by that point.

The only things that matter right now:
1. Does it work?
2. Is it fast?
3. Did you understand why you built it this way?

If yes to all three, move on.
