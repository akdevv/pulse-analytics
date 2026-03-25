-- Indexes for the events hypertable.
--
-- Why these specific indexes?
-- TimescaleDB creates indexes per-chunk automatically, so these stay small
-- and fast even as the table grows. Without them, every dashboard query
-- would scan every row in every relevant chunk.
--
-- The (siteId, receivedAt) index covers the WHERE clause of almost every
-- analytics query — "show me events for this site in this time range".
-- Everything else is supplementary for specific query patterns.

CREATE INDEX IF NOT EXISTS idx_events_site_time
  ON events ("siteId", "receivedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_events_site_path_time
  ON events ("siteId", "urlPathname", "receivedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_events_session_time
  ON events ("sessionId", "receivedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_events_visitor_time
  ON events ("visitorId", "receivedAt" DESC);