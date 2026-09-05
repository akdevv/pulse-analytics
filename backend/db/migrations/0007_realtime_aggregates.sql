-- materialized_only = true returned pre-computed rows only, so an event stayed
-- invisible for up to an hour while the realtime widget already counted it.
-- false makes TimescaleDB UNION the materialized rows with a live aggregate
-- over anything newer than the last refresh. Costs a little per query, bounded
-- by the 1 hour schedule_interval.

ALTER MATERIALIZED VIEW hourly_pageviews
  SET (timescaledb.materialized_only = false);

ALTER MATERIALIZED VIEW daily_pageviews
  SET (timescaledb.materialized_only = false);
