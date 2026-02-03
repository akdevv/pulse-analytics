CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;


SELECT create_hypertable(
  'events',
  'receivedAt',
  chunk_time_interval => INTERVAL '1 day',  -- Partition by day
  if_not_exists => TRUE
);

-- pageviews_1min - Real-time (last 24 hours)
CREATE MATERIALIZED VIEW pageviews_1min
WITH (timescaledb.continuous) AS
SELECT
  siteId,
  time_bucket('1 minute', receivedAt) AS bucket,

  COUNT(*) FILTER (WHERE eventType = 'PAGEVIEW') AS pageviews,
  approx_count_distinct(visitorId) AS uniqueVisitors,
  approx_count_distinct(sessionId) AS sessions,

  COUNT(*) FILTER (WHERE deviceType = 'mobile') AS mobile,
  COUNT(*) FILTER (WHERE deviceType = 'desktop') AS desktop,
  COUNT(*) FILTER (WHERE deviceType = 'tablet') AS tablet

FROM events
GROUP BY siteId, bucket;

-- pageviews_1hour - Recent (last 7 days)
CREATE MATERIALIZED VIEW pageviews_1hour
WITH (timescaledb.continuous) AS
SELECT
  siteId,
  time_bucket('1 hour', bucket) AS bucket,

  SUM(pageviews) AS pageviews,
  approx_count_distinct(uniqueVisitors) AS uniqueVisitors,
  approx_count_distinct(sessions) AS sessions,

  SUM(mobile) AS mobile,
  SUM(desktop) AS desktop,
  SUM(tablet) AS tablet

FROM pageviews_1min
GROUP BY siteId, bucket;

-- pageviews_1day - Historical (1 year +)
CREATE MATERIALIZED VIEW pageviews_1day
WITH (timescaledb.continuous) AS
SELECT
  siteId,
  time_bucket('1 day', bucket) AS bucket,

  SUM(pageviews) AS pageviews,
  approx_count_distinct(uniqueVisitors) AS uniqueVisitors,
  approx_count_distinct(sessions) AS sessions

FROM pageviews_1hour
GROUP BY siteId, bucket;

-- Bounce Rate
SELECT
  COUNT(*) FILTER (WHERE pageviews = 1)::float / COUNT(*) AS bounce_rate
FROM (
  SELECT
    sessionId,
    COUNT(*) AS pageviews
  FROM events
  WHERE siteId = $1
    AND receivedAt BETWEEN $2 AND $3
  GROUP BY sessionId
) s;

-- Data Retention Policies
SELECT add_retention_policy('events', INTERVAL '30 days');
SELECT add_retention_policy('pageviews_1min', INTERVAL '7 days');
SELECT add_retention_policy('pageviews_1hour', INTERVAL '90 days');

-- Indexes
CREATE INDEX idx_pageviews_1min_site_bucket ON pageviews_1min (site_id, bucket DESC);
CREATE INDEX idx_pageviews_1hour_site_bucket ON pageviews_1hour (site_id, bucket DESC);
CREATE INDEX idx_pageviews_1day_site_bucket ON pageviews_1day (site_id, bucket DESC);
