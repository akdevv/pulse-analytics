-- The wall behind ai.validator.ts and the prompt rules. Anything slipping past
-- both still lands on a role with no write privilege and no grant on a base
-- table. Site scoping lives in the views: the runner sets pulse.site_id via
-- SET LOCAL with an id that already passed getSiteForUser(), so the model never
-- writes a tenant predicate.

-- Dev password. Production resets it: ALTER ROLE ai_readonly PASSWORD '...'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ai_readonly') THEN
    CREATE ROLE ai_readonly LOGIN PASSWORD 'ai_readonly';
  END IF;
END
$$;

-- Belt and braces: the runner sets both of these per transaction too.
ALTER ROLE ai_readonly SET default_transaction_read_only = on;
ALTER ROLE ai_readonly SET statement_timeout = '5s';

REVOKE ALL ON SCHEMA public FROM ai_readonly;
GRANT USAGE ON SCHEMA public TO ai_readonly;

-- The aggregates carry no identifiers (no visitorId, sessionId, ipAddress,
-- userAgent, url or eventProperties), and events is never exposed.
--
-- No security_invoker, so these run with the owner's privileges. That is what
-- lets ai_readonly read them while staying denied on the aggregates themselves.
--
-- current_setting() takes one argument on purpose: unset, it raises instead of
-- returning NULL, so a runner that forgets SET LOCAL fails loudly.
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

-- daily_pageviews has no referrer, and its time column is "day". Aliased to
-- "bucket" so both views match and the prompt needs one less rule.
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
