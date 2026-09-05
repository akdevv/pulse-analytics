-- migrate_data moves existing rows into chunks. if_not_exists makes a rerun a no-op.

SELECT create_hypertable(
  'events',
  'receivedAt',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists       => TRUE,
  migrate_data        => TRUE
);