-- Read-only Postgres role for the AI query feature. It can select two views and
-- nothing else. The validator (ai.validator.ts) and the prompt rules cover the
-- same ground, so a statement that slips past both still lands on a role with no
-- write privilege and no grant on any base table.
--
-- Site scoping lives in the views. The runner sets pulse.site_id with SET LOCAL
-- inside the transaction, using a site id that already passed getSiteForUser().
-- The model never writes a tenant predicate.

-- Dev password only. Production resets it from a secret:
--   ALTER ROLE ai_readonly PASSWORD '...';
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ai_readonly') THEN
    CREATE ROLE ai_readonly LOGIN PASSWORD 'ai_readonly';
  END IF;
END
$$;

-- The runner also opens BEGIN READ ONLY and sets a local statement_timeout.
-- These keep it safe if it forgets.
ALTER ROLE ai_readonly SET default_transaction_read_only = on;
ALTER ROLE ai_readonly SET statement_timeout = '5s';

REVOKE ALL ON SCHEMA public FROM ai_readonly;
GRANT USAGE ON SCHEMA public TO ai_readonly;

-- Both continuous aggregates already carry no identifiers: no id, visitorId,
-- sessionId, eventId, ipAddress, userAgent, url, urlSearch or eventProperties.
-- The events table is never exposed.
--
-- No security_invoker, so these views run with the owner's privileges. That is
-- what lets ai_readonly read them while staying denied on hourly_pageviews and
-- daily_pageviews.
--
-- current_setting() takes one argument on purpose. When unset it raises instead
-- of returning NULL, so a runner that forgets SET LOCAL fails loudly.
CREATE OR REPLACE VIEW ask_hourly AS
SELECT
  bucket,
  "urlPathname",
  "referrer",
  "browser",
  "os",
  "deviceType",
  "country",
  pageviews,
  sessions,
  visitors
FROM hourly_pageviews
WHERE "siteId" = current_setting('pulse.site_id')::uuid::text;

-- daily_pageviews has no referrer column, and its time column is "day". Aliased
-- to "bucket" so both views match and the prompt has one less rule.
CREATE OR REPLACE VIEW ask_daily AS
SELECT
  day AS bucket,
  "urlPathname",
  "browser",
  "os",
  "deviceType",
  "country",
  pageviews,
  sessions,
  visitors
FROM daily_pageviews
WHERE "siteId" = current_setting('pulse.site_id')::uuid::text;

GRANT SELECT ON ask_hourly, ask_daily TO ai_readonly;
