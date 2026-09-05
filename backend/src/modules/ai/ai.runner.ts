import { Pool } from "pg";
import env from "@/config/env.ts";
import logger from "@/utils/logger.ts";
import { AppError } from "@/utils/app-error.ts";

// Hard caps on anything the model produces.
const MAX_ROWS = 1000;
const STATEMENT_TIMEOUT = "5s";
const MIN_PAGEVIEWS = 3;

// The quasi-identifiers. Country plus browser plus a narrow window can
// describe one person. A row carrying none of them (a site-wide total) ties
// back to nobody, so suppressing it protects nothing and breaks the answer.
const IDENTIFYING_COLUMNS = [
  "urlPathname",
  "referrer",
  "browser",
  "os",
  "deviceType",
  "country",
] as const;

export type RunResult = {
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  suppressed: number;
  latencyMs: number;
};

// `repairable` marks errors the model could plausibly fix from the message.
export class SqlRunError extends Error {
  constructor(
    message: string,
    public readonly pgCode?: string,
    public readonly repairable = false
  ) {
    super(message);
    this.name = "SqlRunError";
  }
}

let pool: Pool | undefined;

// Lazy, so the API still boots without AI_DATABASE_URL.
const getPool = (): Pool => {
  if (!env.AI_DATABASE_URL) {
    throw AppError.internal("AI querying is not configured");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: env.AI_DATABASE_URL,
      max: 2, // a runaway query cannot starve the app's own pool
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
    pool.on("error", (err) =>
      logger.error("[ai.runner] idle client error", err)
    );
  }
  return pool;
};

export const closeAiPool = async () => {
  await pool?.end();
  pool = undefined;
};

// As a subquery, the model's own LIMIT cannot exceed ours. The +1 separates
// "exactly MAX_ROWS" from "more than we return". Keep the newline before `)`:
// SQL ending in a `-- comment` would otherwise comment out its own paren.
const wrap = (sql: string) =>
  `SELECT * FROM (\n${sql.trim().replace(/;+\s*$/, "")}\n) AS ai_result LIMIT ${MAX_ROWS + 1}`;

const toRunError = (err: unknown): SqlRunError => {
  const code = (err as { code?: string }).code;
  const message = err instanceof Error ? err.message : String(err);

  if (code === "57014") {
    return new SqlRunError(`Query exceeded the ${STATEMENT_TIMEOUT} limit`, code);
  }
  if (code === "42501" || code === "25006") {
    // Never repairable. Retrying against a denied table burns a request.
    logger.warn("[ai.runner] sandbox refused a statement", { code, message });
    return new SqlRunError("Query is not allowed on this data", code);
  }
  // 42xxx is syntax, unknown table, column or function. Worth one repair.
  return new SqlRunError(message, code, code?.startsWith("42") ?? false);
};

export const runQuery = async (
  sql: string,
  siteId: string
): Promise<RunResult> => {
  const client = await getPool().connect();
  const startedAt = Date.now();

  try {
    await client.query("BEGIN READ ONLY");
    await client.query(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT}'`);
    // SET LOCAL takes no bind parameters. set_config(..., true) is the
    // parameterised equivalent, so the site id never gets concatenated in.
    await client.query("SELECT set_config('pulse.site_id', $1, true)", [siteId]);

    const result = await client.query(wrap(sql));
    await client.query("COMMIT");

    const truncated = result.rows.length > MAX_ROWS;
    const rows = result.rows.slice(0, MAX_ROWS);

    // ponytail: k-anonymity as a post-filter. Two known ceilings. It reads only
    // the columns the query named, so an unaliased SUM(pageviews) arrives as
    // `sum` unchecked; and it counts pageviews, not people, so three views by
    // one visitor pass. Enforcing both inside generated SQL is the real fix.
    const visible = rows.filter((r) => {
      const identifying = IDENTIFYING_COLUMNS.some((c) => c in r);
      if (!identifying) return true;
      return r.pageviews === undefined || Number(r.pageviews) >= MIN_PAGEVIEWS;
    });

    return {
      rows: visible,
      rowCount: visible.length,
      truncated,
      suppressed: rows.length - visible.length,
      latencyMs: Date.now() - startedAt,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw toRunError(err);
  } finally {
    client.release();
  }
};
