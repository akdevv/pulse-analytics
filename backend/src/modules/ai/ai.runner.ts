import { Pool } from "pg";
import env from "@/config/env.ts";
import logger from "@/utils/logger.ts";
import { AppError } from "@/utils/app-error.ts";

// Hard caps on anything the model produces.
const MAX_ROWS = 1000;
const STATEMENT_TIMEOUT = "5s";
const MIN_PAGEVIEWS = 3;

// Suppression only applies to rows that carry one of these. They are the
// quasi-identifiers: country + browser + a narrow time window can describe one
// person. A row without any of them — a site-wide total, a per-day count — has
// no attribute to tie back to anybody, so withholding it protects nothing and
// only breaks the answer.
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

// Thrown for anything the database refused. `repairable` marks the errors the
// model has a realistic chance of fixing if handed the message back.
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

// Built lazily so the API still boots without AI_DATABASE_URL — the feature is
// off, not the server.
const getPool = (): Pool => {
  if (!env.AI_DATABASE_URL) {
    throw AppError.internal("AI querying is not configured");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: env.AI_DATABASE_URL,
      max: 2, // a runaway generated query cannot starve the app's pool
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

// The generated statement becomes a subquery, so whatever LIMIT it does or
// doesn't carry cannot exceed ours. MAX_ROWS + 1 tells "exactly 1000 rows"
// apart from "more than we will return".
// The newline before the closing paren matters: SQL ending in a `-- comment`
// would otherwise comment out its own `)` and fail to parse.
const wrap = (sql: string) =>
  `SELECT * FROM (\n${sql.trim().replace(/;+\s*$/, "")}\n) AS ai_result LIMIT ${MAX_ROWS + 1}`;

const toRunError = (err: unknown): SqlRunError => {
  const code = (err as { code?: string }).code;
  const message = err instanceof Error ? err.message : String(err);

  if (code === "57014") {
    return new SqlRunError(`Query exceeded the ${STATEMENT_TIMEOUT} limit`, code);
  }
  if (code === "42501" || code === "25006") {
    // The sandbox refused it. Never hand this back for repair — a model that
    // retries against a denied table just burns another request.
    logger.warn("[ai.runner] sandbox refused a statement", { code, message });
    return new SqlRunError("Query is not allowed on this data", code);
  }
  // 42xxx: syntax error, unknown table, unknown column, unknown function.
  // These are the ones worth one repair attempt.
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
    // SET LOCAL takes no bind parameters. set_config(..., is_local => true) is
    // the parameterised equivalent — the site id never goes near string
    // concatenation.
    await client.query("SELECT set_config('pulse.site_id', $1, true)", [siteId]);

    const result = await client.query(wrap(sql));
    await client.query("COMMIT");

    const truncated = result.rows.length > MAX_ROWS;
    const rows = result.rows.slice(0, MAX_ROWS);

    // ponytail: k-anonymity as a post-filter, per notes §6. Two known ceilings.
    // It can only read columns the query named, so `SELECT SUM(pageviews)` with
    // no alias arrives as `sum` and is not checked. And it counts pageviews, not
    // people: three views by one visitor pass. Enforcing either inside arbitrary
    // generated SQL is the real fix and is much harder.
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
