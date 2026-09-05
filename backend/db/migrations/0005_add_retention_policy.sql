-- Drops raw events past 90 days, by chunk rather than row-by-row DELETE.
-- The continuous aggregates keep the stats, so only the ability to re-query
-- individual raw events is lost.

SELECT add_retention_policy(
  'events',
  INTERVAL '90 days',
  if_not_exists => TRUE
);