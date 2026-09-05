# AI Query — architecture

Conversational natural-language querying of a site's analytics. The user asks
"what were my top pages last week?", the model writes SQL, a runner executes it,
the rows come back. The model never touches the database.

Status: built 2026-09-05. Backend is `backend/src/modules/ai/`, frontend is the
"Ask AI" tab on a site. Not built yet, all deliberate: the SQL cache (§9), the
global daily budget (§9), SSE streaming (§3) and LLM call #2 (§3) — answers come
back as a table plus the SQL, which §12.2 already leaned towards.

---

## 1. Core principle

**LLM output is untrusted input, exactly like a request body.**

The goal is not to detect prompt injection. It is to make the model's output
powerless — so that a successful injection buys the attacker nothing. Security
comes from the database role and the validator. The prompt's rules are UX; they
are not a control.

Three properties, in order of how much they matter:

1. The AI connects as a Postgres role that is physically incapable of writing,
   and can see two views and nothing else.
2. The model that writes SQL never sees a single row of database content.
3. Every generated statement is parsed to an AST and checked before it runs.

Remove 3 and the system is still safe. Remove 1 and nothing else saves it.

---

## 2. Access control

**Authentication is required. No anonymous asks, ever.**

- `authenticateToken` on every AI route, same as `analytics.routes.ts`.
- Authentication is not sufficient on its own — a logged-in user must not be
  able to ask about someone else's site. Reuse the existing ownership check
  (`getSiteForUser(siteId, userId)`) and run it **before** the LLM call, not
  after. No site, no request, no token spend.
- Site scoping is then enforced a second time inside the database (§4), so an
  ownership-check bug still cannot leak another tenant's data.
- Public demo mode does not get a live ask box. Per `ROADMAP.md §7`, snapshot
  mode either disables it with a note or replays pre-recorded questions.

---

## 3. Flow

```
POST /ai/:siteId/ask   { question, conversationId? }
  │
  ├─ authenticateToken                    ← 401 if absent/expired/revoked
  ├─ getSiteForUser(siteId, userId)       ← 404 if not theirs
  ├─ rate limit (redis) + daily budget
  ├─ cache lookup: sha256(normalized question + siteId) → cached SQL
  │
  ├─ LLM call #1 — NL → SQL
  │     input:  schema description + conversation history + question
  │     input never includes database rows
  │     output: { kind: "query" | "chat" | "refuse", sql?, reply? }
  │
  ├─ VALIDATOR (AST)
  │     fail → one repair retry with the error → fail again → surface, stop
  │
  ├─ RUNNER (separate pool, ai_readonly role)
  │     BEGIN READ ONLY;
  │       SET LOCAL statement_timeout = '5s';
  │       SET LOCAL pulse.site_id = $1;
  │       <generated sql>            -- wrapped in an outer LIMIT 1000
  │     COMMIT;
  │
  ├─ LLM call #2 — rows → prose (optional)
  │     sees rows; can only emit text, rendered as text
  │
  └─ persist message row → stream response over SSE
```

Streaming reuses the SSE pattern already in `analytics.controller.ts`.

**Why the split into two calls matters.** Call #1 writes SQL but is blind to
data. Call #2 sees data but cannot write SQL. A poisoned `pageTitle` or
`referrer` planted by a visitor can never reach the model that generates
queries. That is structural, and it is the whole prompt-injection defence.

---

## 4. Layer 1 — the database role

The only layer that cannot be bypassed. Migration `db/migrations/0008_ai_readonly.sql`:

```sql
CREATE ROLE ai_readonly LOGIN PASSWORD '...';
REVOKE ALL ON SCHEMA public FROM ai_readonly;
GRANT USAGE ON SCHEMA public TO ai_readonly;
GRANT SELECT ON ask_hourly, ask_daily TO ai_readonly;
ALTER ROLE ai_readonly SET default_transaction_read_only = on;
ALTER ROLE ai_readonly SET statement_timeout = '5s';
```

Site scoping lives in the view, so the model never writes a tenant predicate
and cannot address another site:

```sql
CREATE VIEW ask_hourly AS
  SELECT * FROM hourly_pageviews
  WHERE "siteId" = current_setting('pulse.site_id')::uuid;
```

The runner sets `pulse.site_id` with `SET LOCAL` inside the transaction, from
the already-ownership-checked site id. A cross-tenant leak now requires a
Postgres bug, not a clever prompt.

Connection: a second `pg.Pool` on `AI_DATABASE_URL` with `max: 2`. Prisma keeps
the app role. A runaway generated query cannot starve the application pool.

---

## 5. Layer 2 — the validator

Regex is not sufficient — statement splitting, comment tricks and CTE writes all
walk through it. Parse to an AST (`libpg-query`) and reject:

- more than one statement — kills `; DROP ...`
- a root node that is not `SelectStmt`
- any CTE containing an Insert/Update/Delete
- any table reference outside `{ ask_hourly, ask_daily }` — kills `pg_catalog`,
  `pg_shadow`, `information_schema`
- any function outside a numeric/date/string allowlist — kills `pg_sleep`,
  `pg_read_file`, `dblink`, `query_to_xml`

Deliberately redundant with the role. The role is the wall; the validator is the
fast, legible rejection with an error the model can repair from.

---

## 6. Layer 3 — what the AI is allowed to see

`hourly_pageviews` and `daily_pageviews` already contain **no identifiers** —
bucket, siteId, pathname, referrer, browser, os, deviceType, country, and
counts. No `id`, `visitorId`, `sessionId`, `eventId`, `ipAddress`, `userAgent`,
`url`, `urlSearch`, `eventProperties`. That is the AI surface, unchanged. The
`events` table is never exposed.

Dropping identifiers is not anonymity. `country = 'Nepal' AND browser =
'Firefox' AND bucket = '2026-09-04 14:00'` can be one person. Mitigations, cheap
ones:

- keep the aggregate surface as-is; never widen it to raw events without
  rebuilding this analysis
- one hour is the finest time granularity available (already true)
- post-execution, drop result rows with `pageviews < 3`. Blunt, one line.
  Revisit if it starts hiding legitimate answers.

Forcing k-anonymity inside arbitrary generated SQL is hard; filtering the result
set afterwards is not.

---

## 7. Data model

```prisma
model Conversation {
  id, userId, siteId, title, createdAt
}

model AiMessage {
  id, conversationId, role, content,
  sql?, rowCount?, latencyMs?, error?, createdAt
}
```

`AiMessage` **is** the audit log — no second table. Store the generated SQL
always; store returned rows never. Re-run to see rows again; this keeps visitor
data out of a second store.

---

## 8. Provider

Settled in `ROADMAP.md §7`. One `fetch` against an OpenAI-compatible
`/chat/completions`, three env vars:

```
AI_BASE_URL
AI_API_KEY
AI_MODEL
AI_DATABASE_URL     # ai_readonly connection string
```

No SDK, no provider abstraction layer. Ask for JSON, parse it, validate with
Zod, retry once on a parse failure. Swapping free tiers is a config edit.

---

## 9. Cost and availability

Free-tier day caps mean the rate limiter is availability control, not just cost
control.

- per-user limit via the existing Redis limiter
- global daily cap; past it, degrade to a clear "out of budget today" message
- cache the **SQL** keyed by `sha256(normalized question + siteId)`, not the
  rows — stays correct as data grows, and skips call #1 entirely on a hit

---

## 10. File layout

```
backend/src/modules/ai/
  ai.routes.ts        authenticateToken on every route
  ai.controller.ts    request/response, SSE
  ai.service.ts       orchestration: ownership → LLM → validate → run → persist
  ai.prompt.ts        schema description, rules, few-shot examples
  ai.validator.ts     AST checks
  ai.runner.ts        ai_readonly pool, read-only transaction, timeouts
  ai.repository.ts    conversations and messages
  ai.types.ts

backend/db/migrations/0008_ai_readonly.sql
```

---

## 11. Deliberately skipped

- A prompt-injection classifier or monitoring model. The two-call split (§3)
  removes the payoff. Add one only if a real bypass appears.
- A semantic layer or query DSL. The view plus the allowlist covers it.
- Multi-turn SQL refinement beyond passing prior turns as history.
- Caching result rows.

---

## 12. Open decisions

1. **Aggregates only, or raw events too?** The caggs answer most questions and
   are already PII-free. Raw events would unlock custom-event names and full
   paths, but needs a hand-built safe view and a fresh look at §6.
   Leaning: aggregates only for v1; add `ask_events` when custom-event
   reporting lands.
2. **Always run call #2?** It costs a second free-tier request per ask.
   Leaning: skip it when the result is a clean table — show rows plus the SQL.
3. **Result row cap.** 1000, enforced by wrapping the generated statement in an
   outer `LIMIT 1001` — the extra row is how the UI knows to say "truncated".
   Never hit in practice yet; the model writes its own `LIMIT` most of the time.

---

## 13. What the build changed

- `daily_pageviews.day` is exposed as `bucket` in `ask_daily`, so both views have
  the same time column and the prompt has one less rule to carry.
- `"siteId"` is TEXT, not uuid (Prisma maps `String @default(uuid())` that way),
  so the view predicate casts `current_setting('pulse.site_id')::uuid::text` —
  through uuid and back, which keeps a malformed setting loud.
- `siteId` is dropped from both views entirely. The role can only ever see one
  site, so the column carries no information and would only tempt the model.
- Conversation history is read from the database, never from the request body. A
  caller cannot rewrite its own past turns to steer the model.
- `prisma migrate dev` cannot be used in this repo: the TimescaleDB migrations
  make Prisma see drift and its only remedy is a database reset. The AI tables
  went in as hand-written SQL, applied, then `prisma migrate resolve --applied`.
- libpg-query's parser is WASM and must be `loadModule()`ed before the first
  parse. Skipping that throws on every statement, which looks exactly like a
  working validator while it rejects valid SQL.
