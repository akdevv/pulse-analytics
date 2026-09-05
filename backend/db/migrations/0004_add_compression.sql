-- Chunks past the threshold compress in the background and stay queryable.
-- segmentby keeps one site's rows in the same block, so per-site queries stay
-- fast on compressed chunks.

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