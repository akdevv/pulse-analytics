import { describe, expect, it } from "vitest";
import { validateSql } from "@/modules/ai/ai.validator.ts";

// The security boundary on model-generated SQL, redundant with the ai_readonly
// role. Most cases here would also be refused by the database, except the
// pg_catalog and site-scope ones that every Postgres role is allowed to do.

const accepts = async (sql: string) => (await validateSql(sql)).ok;
const reason = async (sql: string) => {
  const verdict = await validateSql(sql);
  return verdict.ok ? undefined : verdict.reason;
};

describe("validateSql", () => {
  describe("accepts read-only queries over the two views", () => {
    it.each([
      [
        "aggregate over ask_daily",
        'SELECT "urlPathname", SUM(pageviews) FROM ask_daily GROUP BY 1 ORDER BY 2 DESC LIMIT 10',
      ],
      [
        "time filter over ask_hourly",
        "SELECT count(*) FROM ask_hourly WHERE bucket > now() - interval '1 day'",
      ],
      [
        "read-only CTE",
        "WITH t AS (SELECT browser, SUM(pageviews) p FROM ask_hourly GROUP BY 1) SELECT * FROM t ORDER BY p DESC",
      ],
      [
        "CTE used within its own scope",
        "WITH t AS (SELECT 1) SELECT * FROM t, (SELECT * FROM ask_daily) x",
      ],
      [
        "join across both views",
        'SELECT h.bucket, d.pageviews FROM ask_hourly h JOIN ask_daily d ON d.bucket = h.bucket',
      ],
      ["window function", "SELECT bucket, rank() OVER (ORDER BY pageviews DESC) FROM ask_daily"],
      ["explicit public schema on an allowed view", "SELECT * FROM public.ask_daily"],
      ["pg_catalog qualifier on an allowlisted function", "SELECT pg_catalog.count(*) FROM ask_daily"],
      ["a trailing semicolon is still one statement", "SELECT 1 FROM ask_daily;"],
    ])("%s", async (_label, sql) => {
      expect(await accepts(sql)).toBe(true);
    });

    it("treats a trailing comment as a comment, not a second statement", async () => {
      expect(await accepts("SELECT * FROM ask_daily -- ; DROP TABLE events")).toBe(true);
    });
  });

  describe("rejects anything that is not a single SELECT", () => {
    it.each([
      ["stacked statements", "SELECT 1; DROP TABLE events"],
      ["stacked statements hidden after a comment", "SELECT 1 /* x */ ; DELETE FROM events"],
      ["drop", "DROP TABLE events"],
      ["insert", "INSERT INTO ask_hourly VALUES (now())"],
      ["update", "UPDATE events SET url = 'x'"],
      ["delete", "DELETE FROM events"],
      ["truncate", "TRUNCATE events"],
      ["create table", "CREATE TABLE x (a int)"],
      ["alter role", "ALTER ROLE ai_readonly SUPERUSER"],
      ["grant", "GRANT SELECT ON events TO ai_readonly"],
      ["copy", "COPY events TO '/tmp/out.csv'"],
      ["explain wrapping a select", "EXPLAIN SELECT * FROM ask_daily"],
      ["a writing CTE is still a write", "WITH x AS (DELETE FROM events RETURNING *) SELECT * FROM x"],
      ["an inserting CTE", "WITH x AS (INSERT INTO events DEFAULT VALUES RETURNING *) SELECT * FROM x"],
      ["select into creates a table", "SELECT * INTO copy_of_it FROM ask_daily"],
      ["unparseable input", "not sql at all"],
    ])("%s", async (_label, sql) => {
      expect(await accepts(sql)).toBe(false);
    });
  });

  describe("rejects relations outside the two views", () => {
    it.each([
      ["the raw events hypertable", "SELECT * FROM events"],
      ["the aggregate under the view", "SELECT * FROM hourly_pageviews"],
      ["the users table", "SELECT email FROM users"],
      ["public-qualified read of a real table", "SELECT * FROM public.events"],
      ["pg_catalog", "SELECT * FROM pg_catalog.pg_shadow"],
      ["information_schema", "SELECT * FROM information_schema.tables"],
      ["a subquery reaching a real table", "SELECT (SELECT count(*) FROM events) FROM ask_daily"],
      ["a joined real table", "SELECT * FROM ask_daily d JOIN events e ON true"],
    ])("%s", async (_label, sql) => {
      expect(await accepts(sql)).toBe(false);
    });

    // Collected tree-wide, a nested CTE name shadowed the real hypertable.
    it("does not let a CTE name escape the query that declares it", async () => {
      expect(await accepts("SELECT * FROM (WITH events AS (SELECT 1) SELECT 1) z, events")).toBe(false);
    });
  });

  describe("rejects functions outside the allowlist", () => {
    it.each([
      ["pg_sleep", "SELECT pg_sleep(10)"],
      ["pg_read_file", "SELECT pg_read_file('/etc/passwd')"],
      ["query_to_xml", "SELECT query_to_xml('SELECT 1', true, true, '')"],
      ["dblink", "SELECT * FROM ask_daily WHERE pageviews > (SELECT dblink('', ''))::int"],
      ["current_user", "SELECT current_user FROM ask_daily"],
      ["a non-pg_catalog qualifier", "SELECT ai.whatever() FROM ask_daily"],
    ])("%s", async (_label, sql) => {
      expect(await accepts(sql)).toBe(false);
    });

    // Reaching another tenant means rewriting pulse.site_id, which needs
    // set_config, so set_config must never be callable.
    it("cannot re-point the site scope at another tenant", async () => {
      expect(
        await accepts(
          "SELECT set_config('pulse.site_id', '00000000-0000-0000-0000-000000000000', true) FROM ask_daily"
        )
      ).toBe(false);
      expect(await accepts("SELECT current_setting('pulse.site_id') FROM ask_daily")).toBe(false);
    });
  });

  it("explains the rejection well enough for the model to repair from", async () => {
    expect(await reason("SELECT * FROM events")).toMatch(/ask_hourly and ask_daily/);
    expect(await reason("SELECT pg_sleep(1)")).toMatch(/pg_sleep/);
    expect(await reason("SELECT 1; SELECT 2")).toMatch(/one statement/);
  });
});
