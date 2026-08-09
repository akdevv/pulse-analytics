-- Converts the events table into a TimescaleDB hypertable.
--
-- migrate_data => TRUE means any existing rows are safely moved into chunks.
-- if_not_exists => TRUE means re-running this is a no-op.

SELECT create_hypertable(
  'events',
  'receivedAt',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists       => TRUE,
  migrate_data        => TRUE
);