-- Enables compression on the events hypertable.
--
-- How TimescaleDB compression works:
--   Chunks older than the threshold are compressed in the background.
--   Compressed chunks use 90-95% less disk space and are still fully queryable.
--   compress_segmentby tells TimescaleDB to keep all rows for a given siteId
--   together in the same compressed block — this makes per-site queries faster
--   even on compressed data.
--
-- The compression policy runs automatically in the background via a TimescaleDB
-- background worker job. You don't trigger it manually.

ALTER TABLE events SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = '"siteId"',
  timescaledb.compress_orderby   = '"receivedAt" DESC'
);

SELECT add_compression_policy(
  'events',
  INTERVAL '7 days',
  if_not_exists => TRUE
);