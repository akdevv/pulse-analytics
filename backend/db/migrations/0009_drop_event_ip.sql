-- The worker writes NULL here on every insert, so the column holds nothing.
-- Safe under compression: no rewrite, and no aggregate or AI view selects it.

ALTER TABLE events DROP COLUMN IF EXISTS "ipAddress";
