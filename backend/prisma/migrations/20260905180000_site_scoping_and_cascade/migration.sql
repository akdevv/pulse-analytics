-- Hand-written, same reason as 20260905081500.

-- Uniqueness belongs inside one account, not across the platform.
DROP INDEX IF EXISTS "sites_domain_key";
CREATE UNIQUE INDEX IF NOT EXISTS "sites_userId_domain_key"
  ON "sites" ("userId", "domain");

-- The ingestion lookup key. findFirst on a collision would misroute traffic.
DROP INDEX IF EXISTS "sites_trackingId_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "sites_trackingId_key"
  ON "sites" ("trackingId");

-- Was RESTRICT, so deleting a site with any event failed with a 500.
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_siteId_fkey";
ALTER TABLE "events" ADD CONSTRAINT "events_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "sites"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
