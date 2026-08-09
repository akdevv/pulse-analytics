-- Creates pre-computed rollup views over the raw events table.
--
-- Why continuous aggregates?
--   Every dashboard query right now scans raw events. With a small dataset
--   that's fine. At 50M+ rows it's hundreds of milliseconds per query.
--   Continuous aggregates pre-compute the COUNT/SUM/DISTINCT values and
--   store them in a materialized view that TimescaleDB keeps up-to-date
--   automatically as new events arrive.
--
--   hourly_pageviews: one row per (hour, site, page, browser, os, device, country)
--   daily_pageviews:  rolled up from hourly — one row per (day, site, page, ...)
--
-- Dashboard queries hit these views instead of raw events.
-- The difference is scanning hundreds of rows vs millions.

-- Hourly rollup from raw events
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_pageviews
WITH (timescaledb.continuous, timescaledb.materialized_only = true) AS
SELECT
  time_bucket('1 hour', "receivedAt")  AS bucket,
  "siteId",
  "urlPathname",
  "referrer",
  "browser",
  "os",
  "deviceType",
  "country",
  COUNT(*)                             AS pageviews,
  COUNT(DISTINCT "sessionId")          AS sessions,
  COUNT(DISTINCT "visitorId")          AS visitors
FROM events
WHERE "eventType" = 'PAGEVIEW'
GROUP BY bucket, "siteId", "urlPathname", "referrer", "browser", "os", "deviceType", "country"
WITH NO DATA;

SELECT add_continuous_aggregate_policy(
  'hourly_pageviews',
  start_offset      => INTERVAL '3 hours',
  end_offset        => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists     => TRUE
);

-- Daily rollup from hourly (not from raw events)
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_pageviews
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', bucket)  AS day,
  "siteId",
  "urlPathname",
  "browser",
  "os",
  "deviceType",
  "country",
  SUM(pageviews)                AS pageviews,
  SUM(sessions)                 AS sessions,
  SUM(visitors)                 AS visitors
FROM hourly_pageviews
GROUP BY day, "siteId", "urlPathname", "browser", "os", "deviceType", "country"
WITH NO DATA;

SELECT add_continuous_aggregate_policy(
  'daily_pageviews',
  start_offset      => INTERVAL '3 days',
  end_offset        => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 day',
  if_not_exists     => TRUE
);

-- Backfill both views with any data that already exists in the events table.
-- This is a one-time operation — the policies above handle ongoing refresh.
CALL refresh_continuous_aggregate(
  'hourly_pageviews',
  (NOW() - INTERVAL '90 days')::timestamp,
  NOW()::timestamp
);

CALL refresh_continuous_aggregate(
  'daily_pageviews',
  (NOW() - INTERVAL '90 days')::timestamp,
  NOW()::timestamp
);