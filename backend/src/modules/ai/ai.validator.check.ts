// Temporary: the validator's own truth table. Delete when a real test suite
// lands. Every line here is a rejection the ai_readonly role would also make,
// except the pg_catalog ones — those the role permits and only this stops.
import { validateSql } from "./ai.validator.ts";

const cases: [string, boolean, string][] = [
  ['SELECT "urlPathname", SUM(pageviews) FROM ask_daily GROUP BY 1 ORDER BY 2 DESC LIMIT 10', true, "normal query"],
  ["SELECT count(*) FROM ask_hourly WHERE bucket > now() - interval '1 day'", true, "time filter"],
  ["WITH t AS (SELECT browser, SUM(pageviews) p FROM ask_hourly GROUP BY 1) SELECT * FROM t ORDER BY p DESC", true, "read-only CTE"],
  ["SELECT 1; DROP TABLE events", false, "two statements"],
  ["DROP TABLE events", false, "not a select"],
  ["INSERT INTO ask_hourly VALUES (now())", false, "insert"],
  ["WITH x AS (DELETE FROM events RETURNING *) SELECT * FROM x", false, "writing CTE"],
  ["SELECT * FROM events", false, "table outside allowlist"],
  ["SELECT * FROM pg_catalog.pg_shadow", false, "pg_catalog"],
  ["SELECT * FROM information_schema.tables", false, "information_schema"],
  ["SELECT pg_sleep(10)", false, "pg_sleep"],
  ["SELECT pg_read_file('/etc/passwd')", false, "pg_read_file"],
  ["SELECT query_to_xml('SELECT 1', true, true, '')", false, "query_to_xml"],
  ["SELECT * INTO copy_of_it FROM ask_daily", false, "select into"],
  ["SELECT * FROM ask_daily -- ; DROP TABLE events", true, "comment is not a second statement"],
  ["not sql at all", false, "unparseable"],
  // A CTE name is only a relation inside the query that declares it. Collected
  // tree-wide, this shadowed the real events hypertable.
  ["SELECT * FROM (WITH events AS (SELECT 1) SELECT 1) z, events", false, "CTE name escaping its scope"],
  ["WITH t AS (SELECT 1) SELECT * FROM t, (SELECT * FROM ask_daily) x", true, "CTE used within its own scope"],
];

let failures = 0;
for (const [sql, shouldPass, label] of cases) {
  const verdict = await validateSql(sql);
  const passed = verdict.ok === shouldPass;
  if (!passed) failures++;
  console.log(
    `${passed ? "OK  " : "BAD "} ${label}${verdict.ok ? "" : ` -> ${verdict.reason}`}`
  );
}
console.log(failures === 0 ? "\nall cases behave" : `\n${failures} case(s) wrong`);
process.exit(failures === 0 ? 0 : 1);
