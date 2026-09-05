-- Pre-computed rollups so dashboard queries scan hundreds of rows, not millions.
-- TimescaleDB keeps them current as events arrive.
--   hourly_pageviews: one row per (hour, site, page, browser, os, device, country)
--   daily_pageviews:  the same rolled up per day
--
-- Note: the sessions and visitors columns are distinct counts within a group,
-- so they cannot be summed across groups. See analytics.repository.ts.

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

-- From hourly, not from raw events.
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

-- One-time backfill. The policies above handle every refresh after this.
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