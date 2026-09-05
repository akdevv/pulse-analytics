-- Built per chunk, so they stay small as the table grows.
-- (siteId, receivedAt) covers almost every analytics WHERE clause.
-- The rest serve specific query patterns.

CREATE INDEX IF NOT EXISTS idx_events_site_time
  ON events ("siteId", "receivedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_events_site_path_time
  ON events ("siteId", "urlPathname", "receivedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_events_session_time
  ON events ("sessionId", "receivedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_events_visitor_time
  ON events ("visitorId", "receivedAt" DESC);