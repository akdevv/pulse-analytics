import pgQuery from "libpg-query";

// Deliberately redundant with the ai_readonly role. The role is the wall; this
// is the fast, legible rejection that produces an error the model can repair
// from — and it catches the things a role cannot, like pg_catalog reads, which
// every Postgres role is allowed to do.
//
// Regex cannot do this job: statement splitting, comment tricks and CTE writes
// all walk straight through it. Parse to an AST or don't bother.

const ALLOWED_RELATIONS = new Set(["ask_hourly", "ask_daily"]);

// Numeric, date and string work only. Everything not listed is rejected, so a
// new Postgres function is safe-by-default rather than exposed-by-default.
// This is what stops pg_sleep, pg_read_file, dblink and query_to_xml.
const ALLOWED_FUNCTIONS = new Set([
  // aggregates
  "sum", "count", "avg", "min", "max",
  // window
  "rank", "dense_rank", "row_number", "lag", "lead", "ntile",
  // numeric
  "abs", "round", "ceil", "ceiling", "floor", "trunc", "mod", "greatest", "least",
  // null handling
  "coalesce", "nullif",
  // time
  "now", "date_trunc", "date_part", "extract", "age", "time_bucket", "to_char",
  "to_timestamp", "make_interval", "justify_interval",
  // text
  "lower", "upper", "initcap", "length", "trim", "btrim", "ltrim", "rtrim",
  "substring", "substr", "split_part", "concat", "concat_ws", "replace",
  "left", "right", "position", "strpos", "regexp_replace",
]);

export type Verdict = { ok: true } | { ok: false; reason: string };

// libpg-query is the real Postgres grammar compiled to WASM, and the module has
// to be loaded before the first parse. Memoised, so this costs once per process.
// It matters that this is awaited rather than skipped: an unloaded parser throws
// on every statement, which reads as "the validator is working" while actually
// rejecting valid SQL.
let loaded: Promise<unknown> | undefined;
const ready = () => (loaded ??= pgQuery.loadModule());

type Node = Record<string, unknown>;

const funcName = (body: Node): string => {
  const parts = (body.funcname ?? []) as { String?: { sval?: string } }[];
  // pg_catalog.pg_sleep(...) — take the last part, check the qualifier separately
  return parts.map((p) => p.String?.sval ?? "").join(".");
};

export const validateSql = async (sql: string): Promise<Verdict> => {
  await ready();

  let tree: { stmts?: { stmt?: Node }[] };
  try {
    tree = pgQuery.parseSync(sql) as { stmts?: { stmt?: Node }[] };
  } catch (err) {
    return { ok: false, reason: `not parseable as SQL: ${(err as Error).message}` };
  }

  const stmts = tree.stmts ?? [];
  if (stmts.length !== 1) {
    // Kills "SELECT 1; DROP TABLE events" before the database ever sees it.
    return { ok: false, reason: `expected exactly one statement, got ${stmts.length}` };
  }

  const root = stmts[0]?.stmt ?? {};
  const rootType = Object.keys(root)[0];
  if (rootType !== "SelectStmt") {
    return { ok: false, reason: `only SELECT is allowed, got ${rootType ?? "nothing"}` };
  }

  // CTE names are legal relation references, but only inside the query that
  // declares them. Collecting them tree-wide let a nested `WITH events AS (...)`
  // whitelist the real events hypertable for a sibling reference outside its
  // scope, so scope is tracked as the walk descends.
  let reason: string | undefined;

  const inspect = (node: unknown, ctes: ReadonlySet<string>): void => {
    if (reason) return;

    if (Array.isArray(node)) {
      for (const child of node) inspect(child, ctes);
      return;
    }
    if (!node || typeof node !== "object") return;

    for (const [type, rawBody] of Object.entries(node as Node)) {
      if (reason) return;
      if (!rawBody || typeof rawBody !== "object") continue;
      const body = rawBody as Node;

      // A writing CTE is still a write: WITH x AS (INSERT ...) SELECT ...
      if (type.endsWith("Stmt") && type !== "SelectStmt") {
        reason = `${type} is not allowed — SELECT only`;
        return;
      }

      let scope = ctes;

      if (type === "SelectStmt") {
        // SELECT ... INTO new_table creates a table.
        if (body.intoClause) {
          reason = "SELECT INTO is not allowed";
          return;
        }

        const withClause = body.withClause as
          | { ctes?: { CommonTableExpr?: { ctename?: string } }[] }
          | undefined;
        const declared = (withClause?.ctes ?? [])
          .map((c) => c.CommonTableExpr?.ctename)
          .filter((name): name is string => typeof name === "string");
        if (declared.length) scope = new Set([...ctes, ...declared]);
      }

      if (type === "RangeVar") {
        const relname = String(body.relname ?? "");
        const schema = body.schemaname ? String(body.schemaname) : undefined;
        if (schema && schema !== "public") {
          reason = `schema "${schema}" is not readable — use ask_hourly or ask_daily`;
          return;
        }
        if (!ALLOWED_RELATIONS.has(relname) && !scope.has(relname)) {
          reason = `relation "${relname}" does not exist — only ask_hourly and ask_daily do`;
          return;
        }
      }

      if (type === "FuncCall") {
        const name = funcName(body);
        const bare = name.split(".").pop() ?? name;
        const qualifier = name.includes(".") ? name.split(".")[0] : undefined;
        if (qualifier && qualifier !== "pg_catalog") {
          reason = `function "${name}" is not allowed`;
          return;
        }
        if (!ALLOWED_FUNCTIONS.has(bare)) {
          reason = `function "${bare}" is not allowed`;
          return;
        }
      }

      inspect(body, scope);
    }
  };

  inspect(root, new Set<string>());

  return reason ? { ok: false, reason } : { ok: true };
};
