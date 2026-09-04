-- Turns on real-time aggregation for both continuous aggregates.
--
-- The problem:
--   materialized_only = true means a query against the view returns ONLY
--   pre-computed rows. hourly_pageviews refreshes once an hour with a 5 minute
--   end_offset, so an event was invisible to the dashboard for up to an hour
--   after it arrived. The realtime widget reads raw events directly, so it
--   showed 10 pageviews while the overview cards still showed 4.
--
-- The fix:
--   materialized_only = false makes TimescaleDB UNION the materialized rows
--   with a live aggregate over the raw events newer than the last refresh.
--   Queries stay fast (the bulk is still pre-computed) but new events show up
--   immediately.
--
-- Cost: slightly more work per query, proportional to how much data has
-- arrived since the last refresh — bounded by the 1 hour schedule_interval.

ALTER MATERIALIZED VIEW hourly_pageviews
  SET (timescaledb.materialized_only = false);

ALTER MATERIALIZED VIEW daily_pageviews
  SET (timescaledb.materialized_only = false);
