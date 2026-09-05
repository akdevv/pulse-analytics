import pgQuery from "libpg-query";

// Redundant with the ai_readonly role on purpose. The role is the wall. This
// returns an error the model can repair from, and catches what a role cannot,
// such as pg_catalog reads, which every Postgres role may do.
//
// Regex cannot do this. Statement splitting, comment tricks and CTE writes all
// walk through it. Parse to an AST or do not bother.

const ALLOWED_RELATIONS = new Set(["ask_hourly", "ask_daily"]);

// Allowlist, so a new Postgres function is safe by default rather than exposed.
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

// The date/time family plus its _N precision variants. CURRENT_USER,
// SESSION_USER, CURRENT_ROLE and friends identify the connection instead of
// answering a question about traffic, so they stay out.
const ALLOWED_VALUE_FUNCTION_OPS = /^SVFOP_(CURRENT_(DATE|TIME|TIMESTAMP)|LOCALTIME|LOCALTIMESTAMP)(_N)?$/;

export type Verdict = { ok: true } | { ok: false; reason: string };

// The WASM grammar must load before the first parse. Memoised, so it costs
// once per process. Await it: an unloaded parser throws on every statement,
// which looks like the validator working while it rejects valid SQL.
let loaded: Promise<unknown> | undefined;
const ready = () => (loaded ??= pgQuery.loadModule());

type Node = Record<string, unknown>;

const funcName = (body: Node): string => {
  const parts = (body.funcname ?? []) as { String?: { sval?: string } }[];
  // Joined whole, so the caller can check qualifier and bare name separately.
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
    // Stops "SELECT 1; DROP TABLE events" before the database sees it.
    return { ok: false, reason: `expected exactly one statement, got ${stmts.length}` };
  }

  const root = stmts[0]?.stmt ?? {};
  const rootType = Object.keys(root)[0];
  if (rootType !== "SelectStmt") {
    return { ok: false, reason: `only SELECT is allowed, got ${rootType ?? "nothing"}` };
  }

  // A CTE name is a legal relation only inside the query declaring it. Collect
  // them tree-wide and a nested `WITH events AS (...)` would allow the real
  // events hypertable for a sibling outside its scope, so scope descends here.
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

      // CURRENT_USER and friends are keywords, not calls. They parse to
      // SQLValueFunction and would walk straight past ALLOWED_FUNCTIONS.
      if (type === "SQLValueFunction") {
        const op = String(body.op ?? "");
        if (!ALLOWED_VALUE_FUNCTION_OPS.test(op)) {
          reason = `${op.replace(/^SVFOP_/, "").toLowerCase()} is not allowed`;
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
