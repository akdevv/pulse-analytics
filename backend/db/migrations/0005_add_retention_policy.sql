-- Automatically drops raw event data older than 90 days.
--
-- Why you need this:
--   At 10k RPS, the events table grows by ~864 million rows per day.
--   Without a retention policy, your disk fills up and queries slow down.
--   The continuous aggregates (next migration) preserve the historical
--   stats permanently — so you don't lose analytics history, you just
--   lose the ability to re-query raw individual events after 90 days.
--
-- This policy runs as a background job automatically. TimescaleDB drops
-- entire chunks at a time (not row-by-row DELETE), which is extremely fast.

SELECT add_retention_policy(
  'events',
  INTERVAL '90 days',
  if_not_exists => TRUE
);