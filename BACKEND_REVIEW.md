# Backend review

A read of `backend/` as it stands on 5 September 2026.

> **Status: all code findings fixed on 5 September 2026.** Each item below is
> marked `[fixed]` or `[open]`. The two open items are test coverage and CI,
> both of which need work this review did not do.

Every claim here was written from the code, then re-checked in a second pass with
fresh commands: line numbers re-read, counts re-run, and each "unused" symbol
grepped across `src/` and `tests/` to confirm it has no callers. The second pass
found one error, corrected below. Anything that could not be verified was cut
rather than softened.

**Overall: 8/10.** Well structured, unusually strong on security, thin on tests above the service layer. The problems are small and specific, not architectural.

---

## Scores

| Area | Score | One-line reason |
|---|---|---|
| Structure and organisation | 9/10 | Every module has the same five files. Layering holds. |
| File size and naming | 9/10 | Nothing over 367 lines. One naming inconsistency. |
| Security | 9/10 | Defence in depth on the AI path, ingestion, and auth. |
| Test coverage | 6/10 | Services and middleware covered. Controllers and repositories are not. |
| Correctness | 8/10 | Four real bugs, all small, none in a request path. |
| Code quality | 8/10 | Clean and consistent. Some repetition in controllers. |

---

## What is good

- **Module layout is consistent.** All six modules follow `controller / service / repository / routes / types`. A new module has an obvious shape to copy.
- **Layering is respected.** No service imports Prisma directly. No controller does either, except `health.controller.ts`, which is a reasonable exception since it pings the database as its whole job.
- **No file is too long.** The largest is `ai.service.ts` at 367 lines. Only five files pass 200 lines, out of 55. Total source is 4,782 lines excluding generated code.
- **File names match their contents.** No `utils.ts` dumping ground, no `helpers.ts`.
- **No TODO, FIXME, or HACK anywhere** in source, tests, SQL, or the browser SDK.
- **`any` is rare.** Seven occurrences in 4,782 lines, most of them narrow casts.
- **Security work is genuinely layered.** The AI query path has four independent controls: an AST validator that parses with the real Postgres grammar, a read-only role with no grant on any base table, views that inject the tenant predicate, and a k-anonymity post-filter. Any one of them failing still leaves three.
- **Auth details are right.** Timing-equal login failures with a dummy bcrypt hash, a JTI denylist checked on both access and refresh, pinned issuer and algorithm on verify, cookie options defined once so `clearCookie` matches.
- **Ingestion is defensive.** Hostname verification stops a leaked tracking id writing into someone else's dashboard, every string is bounded to its column width, and `req.ip` is used instead of the raw forwarded header.
- **Privacy claims are backed by code.** The worker nulls the IP at the single point every insert passes through, and a test asserts it.

---

## Bugs found

1. `[fixed]` **Off-by-one in the seed script.** `src/seed/index.ts:19` runs `for (let i = 0; i <= 10; i++)`, which creates 11 users, then line 33 logs "10 users created". Line 41 has the same problem: `i <= 50` creates 51 sites and line 56 logs 50. Seed-only, no production impact, but the counts are wrong.

2. `[fixed]` **Per-job logging in the ingestion hot path.** `src/workers/event.worker.ts:209` logs at info level on every `completed` event, and `logger.info` has no level filter in production. That is one JSON line to stdout per ingested event. At the 10,000 RPS the load tests target, it is 10,000 stdout writes a second. Worth noting that `logger.debug` *is* correctly gated on `NODE_ENV`, so this is the one level that leaks.

3. `[fixed]` **The retry batch can grow without bound.** `src/workers/event.worker.ts:141` does `batch = [...toFlush, ...batch]` when a flush fails transiently. If Postgres stays unreachable while events keep arriving, the array grows with no cap until the process runs out of memory. A size ceiling that spills to the dead-letter queue would bound it.

4. `[fixed]` **A stale mock for a deleted function.** `tests/unit/modules/analytics/analytics.service.test.ts:12` still mocks `getRawEvents`, which no longer exists in the service or the repository. Harmless, but it will confuse the next reader.

---

## Dead code

- `[fixed]` `insertEvent` in `src/modules/ingestion/track.repository.ts:20` is exported and has zero callers. The batcher uses `insertManyEvents`.
- `[fixed]` `logRequest`, `logResponse`, and `logError` in `src/utils/logger.ts` are all exported and never called. No request-logging middleware is wired into `app.ts`.
- `[fixed]` The `debug` field in `TrackQuerySchema` is parsed and then never read. The browser SDK keeps its own `data-debug` flag client-side and never sends `debug=` in the query string.
- `[fixed]` `Event.ipAddress` was still declared in `prisma/schema.prisma` and in `src/types/event.ts:41`, but the worker writes `null` to it on every insert. The column holds nothing.

---

## What is missing

- `[open]` **Controllers and repositories have no tests.** 19 test files cover 55 source files. Services, middleware, utils, and the SQL validator are tested well. Not one controller is, and neither is any repository.
- `[open]` **`ai.service.ts` and `ai.runner.ts` are untested.** They are the two files where a mistake costs money or leaks data, and they are the largest untested pair in the repo. `ai.validator.ts` next to them has good tests, which makes the gap more obvious.
- `[open]` **The batcher's failure paths are untested.** `enrichEvent` has a test. `flushBatch` and `isolateAndQuarantine`, which decide whether an event is retried or quarantined, do not.
- `[fixed]` **No rate limit on `/health`.** It is unauthenticated and costs five backend round trips per call: one Postgres query, one Redis ping, and three queue counts.
- `[open, by design]` **Events can be lost on a hard crash.** The worker acknowledges a job as soon as it pushes to the in-memory batch, so the queue will not redeliver it. `SIGTERM` flushes, but `SIGKILL` or an out-of-memory kill drops up to 100 events. This looks like a deliberate throughput trade-off, so it is worth writing down rather than changing.
- `[open]` **No CI config in the repo.** The tests, typecheck, and lint all pass locally and nothing runs them automatically.

---

## Improvements worth making

- `[fixed]` **Extract the repeated controller guard.** `if (!siteId) throw AppError.validation(...)` appears 10 times in `analytics.controller.ts`, and a `req?.user?.userId` check appears 6 times in `site.controller.ts`. Both belong in a small middleware or helper. It would take roughly 60 lines out of `analytics.controller.ts` alone.
- `[fixed]` **Pick one way to read `req.user`.** The codebase uses two styles, split cleanly by file: `ai` and `analytics` use a bare `req.user!`, while `auth` and `site` use a defensive `if (!req?.user?.userId) throw`. All four sit behind `authenticateToken`, so the assertion is the honest one and the checks are unreachable.
- `[fixed]` **Drop the `(req as any).user` casts in `logger.ts`.** Lines 116, 135, and 157 cast to `any` to reach `req.user`, but `src/types/express.d.ts` already augments `Request` with it. `auth.middleware.ts` assigns `req.user` with no cast at all.
- `[fixed]` **Type the `client` parameter in `db/migrate.ts`.** Three helpers take `client: any` (lines 14, 23, 38). `PoolClient` from `pg` is the real type and is already a dependency.
- `[fixed]` **Batch the two queue-depth calls.** `event.worker.ts:107-108` awaits `getWaitingCount()` and `getActiveCount()` in sequence on every flush. `health.controller.ts` already does the equivalent with `Promise.all`.
- `[open]` **Rename the ingestion module files.** Every other module names its files after its folder. `modules/ingestion/` contains `track.*` instead of `ingestion.*`. The folder is the odd one out.
- `[open]` **Consider moving `src/services/geo.service.ts`.** It is the only file in `src/services/`, and it is used solely by the worker.

---

## Notes on the two things that look wrong but are not

- **`geo.service.ts` clears its whole cache when full** rather than evicting the oldest entry. At 10,000 entries this is a rare, cheap operation, and an LRU would cost more per lookup than it saves.
- **`analytics.repository.ts` reads raw events instead of the rollups** for overview and timeseries. That looks like a performance regression, but the rollup's `sessions` and `visitors` columns are distinct counts inside a group and cannot be summed. The comment and the integration test both cover this.

---

## Verification record

Checked in a second pass on 5 September 2026:

- **Counts re-run:** 55 source files, 4,782 lines, 5 files over 200 lines, largest 367. 19 test files. 7 `any`. 0 TODO/FIXME/HACK.
- **Every dead symbol re-grepped** across `src/` and `tests/`: `insertEvent`, `logRequest`, `logResponse`, `logError`, the `debug` query field, and `Event.ipAddress`. All confirmed to have no reader.
- **Every bug re-read at its line:** seed loop bounds, the per-job `logger.info`, the uncapped batch regrowth, and the stale `getRawEvents` mock.
- **Coverage gaps confirmed by file search,** not by assumption: no file named `*controller*` or `*repository*` exists under `tests/`, and `flushBatch` and `isolateAndQuarantine` appear nowhere in the test suite.

One correction came out of that pass: an earlier draft said all four helpers in
`db/migrate.ts` take `client: any`. It is three. `getMigrationFiles` takes no
client. A second line was reworded, since it implied a single controller mixes
both `req.user` styles when the split is clean per file.

One claim was dropped before publishing. An early note said unfiltered `debug`
logging floods the ingestion hot path. Reading `utils/logger.ts:104` showed
`debug` is correctly gated on `NODE_ENV`, so the claim was wrong and only the
`info` case survived.

---

## What the fixes changed

Applied 5 September 2026. `tsc`, `eslint`, and 220 tests pass, and the ingestion
path was exercised end to end against a local Timescale before and after.

- **`src/utils/request-scope.ts` is new.** It holds `userIdOf`, `paramOf`, and
  `siteScope`. Eighteen repeated guards across four controllers now call it.
  `analytics.controller.ts` dropped from 255 lines to 226, `site.controller.ts`
  from 110 to 87. The `ask` error message is unchanged, so no client sees a
  difference.
- **`ipAddress` is gone from the type chain, not just nulled.** `RawEvent` still
  carries it so the worker can resolve geo, `ParsedEvent` does not, and the
  repository has no field to write. Storing an IP is now a type error rather
  than a convention. Migration `0009_drop_event_ip.sql` drops the column, which
  was verified against a real hypertable first.
- **The health limiter deliberately uses the in-memory store,** the only limiter
  that does. `/health` exists to report a Redis outage, so a Redis-backed store
  would turn an informative 503 into an opaque 500.
- **The batcher quarantines overflow rather than growing.** Past `MAX_PENDING`
  (10 batches) the oldest events go to the dead-letter queue, so a long database
  outage cannot exhaust the heap.

### Why the test gaps are still open

This repo's standing rule is that tests are copied from the `pulse-ref`
worktree rather than hand-written. That worktree has no tests for controllers,
repositories, `ai.service.ts`, `ai.runner.ts`, or the batcher's failure paths,
so there was nothing to copy. Writing them is a real task with a real decision
behind it, not a cleanup, and it is left for a session that can pick the
approach deliberately.
