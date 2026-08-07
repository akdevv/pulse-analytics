# Pulse Analytics — Rebuild Guide

Rebuild this project from an empty branch, step by step, understanding each piece
before you keep it. Reference code stays on `main` — you copy from it, but only
after you can answer the questions in each step.

---

## Setup

```bash
# keep the finished code checked out side-by-side as reference
git worktree add ../pulse-ref main

# start an empty branch — no files, no history baggage
git checkout --orphan rebuild
git rm -rf .
```

Now `../pulse-ref/` is the answer key and your working dir is empty.

### The rule

For every file you copy:

1. Read the "Understand" questions in the step. Answer them out loud (or in a
   scratch file) **before** copying.
2. Copy the file.
3. Run the checkpoint. If it fails, debug it yourself before peeking at the next step.

If you can't answer a question, that file is not done — read it line by line
until you can.

### Structure you're heading toward

```
backend/    Express API + BullMQ worker + TimescaleDB migrations
sdk/        @akdevv/pulse — the browser tracker
frontend/   Next.js dashboard
```

Three phases:

- **Phase A (steps 1–17)** — backend, SDK, and a bare-bones frontend that proves the pipeline works
- **Phase B (steps 18–24)** — frontend polish

---

# Phase A — Backend

## Step 1 — Skeleton and tooling

**Build:** `backend/package.json`, `tsconfig.json`, `eslint.config.ts`,
`.prettierrc`, `.gitignore`, `.env.example`.

Start dependencies minimal — `express`, `zod`, `dotenv`, plus `tsx` and
`typescript` as dev deps. Add the rest as each step needs them. Don't paste the
whole dependency list up front; you'll learn more if each package arrives with a
reason.

**Understand:**

- `tsconfig.json` has `"noEmit": true` and `"allowImportingTsExtensions": true`.
  That means you never run `tsc` to build for dev — `tsx` executes TypeScript
  directly, and imports carry a literal `.ts` extension (`@/config/env.ts`).
  Why does `verbatimModuleSyntax` force you to write `import type { … }`?
- `"paths": { "@/*": ["./src/*"] }` — who resolves this at runtime? (Hint: not
  TypeScript. `tsx` does.)
- `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are why you'll see
  `req.params.id!` and `?? undefined` all over the codebase. Those aren't sloppy —
  they're the cost of those two flags. Decide now whether you want that cost.

**Checkpoint:** `pnpm typecheck` runs on an empty `src/`.

---

## Step 2 — Env, config, logger

**Build:** `src/config/env.ts`, `src/config/index.ts`, `src/utils/logger.ts`.

**Understand:**

- `env.ts` parses `process.env` through a Zod schema and calls `process.exit(1)`
  on failure. Why crash at boot instead of throwing at first use?
- Note the split: `env.ts` = things that change per environment. `config/index.ts`
  = things that never change (JWT issuer, algorithm, API version). Why keep them
  in separate files?
- The logger prints coloured lines in dev and single-line JSON in prod. Why JSON?
  (Answer: log aggregators parse it. Grep-ability vs. machine-readability.)

**Checkpoint:** a scratch script importing `env` fails loudly with an empty `.env`,
and prints parsed values with a full one.

---

## Step 3 — Express app + error handling

**Build:** `src/app.ts`, `src/index.ts`, `src/utils/app-error.ts`,
`src/utils/async-handler.ts`, `src/middleware/error.middleware.ts`,
`src/middleware/request-id.ts`, `src/types/express.d.ts`,
`src/modules/health/`.

**Understand:**

- `AppError` has static factories (`AppError.notFound()`, `.unauthorized()`).
  Why factories instead of `new AppError(404, "…")` at each call site?
- `asyncHandler` wraps every controller. What happens in Express 5 if an async
  controller rejects and you *don't* wrap it? (Express 5 actually forwards
  rejections — so check: does your version still need `asyncHandler`? This is a
  legitimate thing to reconsider on the rebuild.)
- `error.middleware.ts` special-cases `err.type === "entity.parse.failed"`.
  Where does that error come from, and why does it need its own branch?
- `express.d.ts` declares `Request.user` and `Request.id` globally. Why a
  `declare global` block and not a custom `AuthedRequest` type?
- Two CORS configs in `app.ts`: `origin: "*"` on `/track`, locked to
  `FRONTEND_URL` everywhere else. Why must the tracking endpoint accept any
  origin, and why is that not a security hole here?

**Checkpoint:**

```bash
pnpm dev:api
curl localhost:8000/api/v1/health          # 200 with a status body
curl localhost:8000/api/v1/nope            # 404 JSON, not an HTML stack trace
```

---

## Step 4 — Postgres, Redis, Prisma

**Build:** `docker-compose.yml`, `prisma/schema.prisma` (just the `User` model
for now), `prisma.config.ts`, `src/config/prisma.ts`, `src/config/redis.ts`.

**Understand:**

- The compose file uses `timescale/timescaledb:latest-pg18`, not plain `postgres`.
  You won't use any Timescale feature until step 13 — but starting on the right
  image saves a migration later.
- Note the volume comment: pg18 images store data in a version-specific subdir,
  so the mount is the parent. That comment exists because it bit you once.
- `prisma.ts` uses `PrismaPg` (the driver adapter) with `max: 5`, not the default
  Prisma engine. Why an adapter, and why cap the pool at 5?
- `schema.prisma` has `output = "../src/generated/prisma"` — the client is
  generated *into your source tree* and committed. What does that buy you at
  deploy time?
- `redis.ts` has a `retryStrategy` that returns `null` after 10 attempts. What
  does returning `null` do, and why give up rather than retry forever?

**Checkpoint:** `docker compose up -d`, then a scratch script that runs
`prisma.$queryRaw\`SELECT 1\`` and `redis.ping()`.

---

## Step 5 — Auth

**Build:** `src/modules/auth/` (types, repository, service, controller, routes),
`src/middleware/validate.ts`, `src/middleware/auth.middleware.ts`,
`src/middleware/rate-limiter.ts`.

This is the biggest single step. Take it in the order: types → repository →
service → controller → routes.

**Understand:**

- The four-file module shape (`types` / `repository` / `service` / `controller`)
  repeats for every module in this codebase. Say out loud what belongs in each.
  The rule: controllers touch `req`/`res` and nothing else; services hold logic
  and throw `AppError`; repositories are the only place `prisma` appears.
- Access token in the JSON response, refresh token in an httpOnly cookie. Why the
  split? What attack does httpOnly stop, and what does it *not* stop?
- Every token gets a `jti` (random UUID). On logout, the `jti` goes into Redis as
  `denylist:<jti>` with a TTL equal to the token's remaining life. Walk through
  why that TTL is exactly right — no cleanup job needed.
- `authenticateToken` checks the denylist on *every* request. That's a Redis round
  trip per authed call. What did you buy for that cost, and would you keep it?
- `validate(schema)` parses `req.body` only. Notice `track.controller.ts` later
  validates `req.query` inline instead. Why the inconsistency — and should the
  rebuild unify them?
- `authRateLimit` swaps to a no-op middleware when `RATE_LIMIT_ENABLED=false`.
  Why decide that at import time rather than checking the flag per request?
- `bcrypt.hash(password, 12)` — what does 12 mean, and roughly how long does one
  hash take? (Measure it. It's the reason login is your slowest endpoint.)

**Checkpoint:**

```bash
curl -X POST localhost:8000/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"name":"Me","email":"a@b.com","password":"Passw0rdd"}'
# → accessToken in body, refresh_token cookie set

curl localhost:8000/api/v1/auth/me -H "authorization: Bearer <token>"   # 200
# then POST /auth/logout with that token, retry /me → 401 TOKEN_REVOKED
```

---

## Step 6 — Sites

**Build:** `Site` model in `schema.prisma`, `src/utils/gen-tracking.ts`,
`src/modules/site/`.

**Understand:**

- `generateTrackingId()` is `"pk-" + randomBytes(24).toString("base64url")`.
  Why 24 bytes? Why base64url and not hex or plain base64? (Check what
  `track.types.ts` regex expects — the two must agree.)
- `getSiteById(userId, siteId)` filters on *both* IDs, and so do update and
  delete. Every repository call is scoped by owner. Why enforce ownership in the
  `where` clause rather than fetching then comparing?
- `createSiteSchema` transforms the domain (trim + lowercase) *before* validating
  it with a `.refine()`. Why is transform-then-refine the right order?
- `regenerateTrackingIdService` invalidates the Redis cache *before* writing the
  new ID. You'll build that cache in step 8 — note the ordering now and check it
  again then. (Is before-write actually correct? Think about what a concurrent
  read caches.)

**Checkpoint:** create a site, list it, regenerate its key, delete it — all
authed. Then try fetching another user's site by ID → should 404, not 403 with
data.

---

## Step 7 — Ingestion, synchronous version

**Build:** `Event` model, `src/types/event.ts`, `src/modules/ingestion/`
(`track.types.ts`, `track.service.ts`, `track.repository.ts`, `track.controller.ts`,
`track.routes.ts`), `src/utils/ip.ts`.

Deliberately build the *slow* version first: the controller writes straight to
the DB with `insertEvent()`. You'll make it async in step 10 — having felt the
slow version is the whole point.

**Understand:**

- Everything comes in as **query params on a POST**, not a JSON body:
  `?v=1&tid=…&t=PAGEVIEW&dl=…`. Why? (Two reasons: `keepalive` beacon-style
  requests, and no CORS preflight for a bodyless POST.)
- The short param names (`tid`, `dl`, `dr`, `cid`, `sid`, `ep`, `z`) mirror
  Google Analytics' Measurement Protocol. `z` is a cache buster. Why does a POST
  need one?
- The endpoint returns **204 on every path** — validation failure, unknown
  tracking ID, rate limited, internal error. Why never surface an error to the
  tracked page?
- `RawEvent` vs `ParsedEvent` in `types/event.ts`: raw is what the request gives
  you, parsed adds `DeviceInfo` + `GeoInfo`. That type split *is* the hot
  path/slow path boundary, expressed in the type system.
- `parseUrl()` swallows malformed URLs and returns `urlHostname: ""`. Why not
  reject the event?
- `express.json({ limit: "8kb" })` is mounted on the track router only. Why not
  globally?
- The schema splits URL into `url`, `urlHostname`, `urlPathname`, `urlSearch` —
  four columns for one string. What query does each one make cheap?

**Checkpoint:**

```bash
curl -X POST "localhost:8000/api/v1/track?v=1&tid=<your-tid>&t=PAGEVIEW&dl=https://example.com/pricing&dt=Pricing"
# → 204, and a row lands in events
```
Time it. Note the number — you'll compare after step 10.

---

## Step 8 — Cache the site lookup

**Build:** `src/modules/ingestion/track.cache.ts`; wire `invalidateSiteCache`
into site delete + regen-key.

**Understand:**

- Cache key `site:tid:<trackingId>`, TTL 300s. Why cache the *site*, of all
  things? (Because it's a DB read on literally every event.)
- The `inflight` Map: on a cache miss, concurrent requests for the same tracking
  ID share one promise. Name the problem this solves. What happens without it
  when a hot site's cache entry expires under load?
- The `catch` falls back to hitting the DB directly if Redis is down. Compare
  that to the rate limiter in step 9, which **fails closed**. Why do these two
  make opposite choices?

**Checkpoint:** hit `/track` twice with the same `tid`, watch the logs go
`[cache] MISS` then `[cache] HIT`. Delete the site, hit it again → `MISS`, then
204 with nothing written.

---

## Step 9 — Rate limit the ingestion path

**Build:** `src/config/ratelimit.ts`, `src/modules/ingestion/track.ratelimit.ts`.

**Understand:**

- The key embeds the current minute: `rateLimit:site:<id>:<floor(now/60000)>`.
  That's a **fixed window** counter. Describe its failure mode at a window
  boundary (hint: 2× the limit in one second is possible). Why is that acceptable
  here and not for, say, payments?
- `INCR` then `EXPIRE` only when the count is 1, TTL 120s for a 60s window. Why
  is the TTL double the window?
- Site limits are per-tier (FREE 1k/min, PRO 10k, ENTERPRISE 100k) *and* there's
  a flat 500/min per IP. What does each one protect against? Why do you need both?
- On a Redis error this returns `{ allowed: false }` — **fail-closed**, drops the
  event. Argue the other side: analytics data is cheap to lose, so should it fail
  open? Decide for yourself and write down why.

**Checkpoint:** set `FREE` to something tiny, blast the endpoint in a loop,
watch `[ratelimit] site limit exceeded` appear and events stop landing.

---

## Step 10 — Queue + worker

**Build:** `src/config/queue.ts`, `src/workers/event.worker.ts`,
`src/worker.ts`, `src/services/geo.service.ts`, `data/GeoLite2-City.mmdb`.
Change the controller from `await insertEvent(…)` to `enqueue(event)`.

This is the architectural heart of the project.

**Understand:**

- The controller calls `enqueue(event)` **without awaiting it**. Deliberate — it
  shaves the Redis round trip off the response. What do you give up? (An enqueue
  failure becomes a silent unhandled rejection.) Is that trade right? Write your
  answer down.
- Job options: `attempts: 3`, exponential backoff from 1000ms,
  `removeOnComplete: 1000`, `removeOnFail: 5000`. Why keep *any* completed jobs?
  Why keep 5× as many failed ones?
- The worker is a **separate process** (`src/worker.ts`, own entrypoint, own
  `pnpm dev:worker`). Why not a background loop inside the API process?
- Enrichment = `ua-parser-js` + a MaxMind GeoIP lookup. Both are the reason
  the queue exists. Time `new UAParser(ua).getResult()` on one string — now
  multiply by 10,000/sec.
- Both caches (`uaCache`, `geoCache`) are plain `Map`s that `.clear()` wholesale
  when full instead of evicting LRU. That's a deliberate shortcut. What's the
  worst case, and when would it stop being acceptable?
- `geo.service.ts` skips private/loopback IPs before touching the reader. Why —
  correctness or speed?
- Failed jobs land in a `events-failed` dead-letter queue, but only once
  `attemptsMade === opts.attempts`. Why check that instead of DLQ-ing on the
  first failure?

**Checkpoint:** run API and worker together (`pnpm dev`). Fire a `/track`, watch
the response go 204 immediately while the worker logs enrichment a moment later.
Compare the `[TRACK] total:` timing against your step 7 number.

---

## Step 11 — Batch the writes

**Build:** batching in `event.worker.ts` — `flushBatch`, `scheduleFlusher`,
`insertManyEvents` in the repository, `startThroughputLogger`, SIGTERM/SIGINT
handlers in `worker.ts`.

**Understand:**

- Flush on **either** 100 events **or** 1 second, whichever hits first. What does
  each condition protect? (One bounds latency, the other bounds write volume.)
- `flushBatch` does `const toFlush = batch; batch = []` before awaiting the
  insert. Read the comment. Explain what breaks if you reset `batch` *after* the
  await instead.
- On flush failure: `batch = [...toFlush, ...batch]` — events go back. Why
  prepend rather than append? What unbounded-growth risk does this create if the
  DB stays down?
- `createMany({ skipDuplicates: true })` — what duplicate could actually occur
  here? (Trace it: BullMQ retries a job whose insert half-succeeded.)
- Shutdown calls `flushBatch()` *then* `worker.close()`. Why that order? What's
  still in flight that this doesn't save?

**Checkpoint:** fire 250 events fast. You should see roughly three
`[worker] Batch flushed` lines, not 250 inserts. Ctrl+C mid-stream and confirm
the partial batch is written, not dropped.

---

## Step 12 — Seed data

**Build:** `src/seed/index.ts`, `src/seed/fake-events.ts`.

You need volume before Timescale means anything. Faker generates users, sites,
and a spread of events across dates, devices, and countries.

**Checkpoint:** `pnpm seed`, then `SELECT COUNT(*) FROM events;` — a few hundred
thousand rows.

---

## Step 13 — TimescaleDB

**Build:** `db/migrate.ts` and `db/migrations/0001…0006.sql`.

**Understand — the migration runner first:**

- Prisma manages the *schema*; this hand-rolled runner manages Timescale-specific
  DDL Prisma can't express. Two migration systems in one project. Where's the
  boundary, and what breaks if you cross it?
- Migrations tracked in a `schema_migrations` table, applied in filename order,
  each wrapped in a transaction — **except** ones matching the Timescale
  patterns, which are split into separate statements and run in autocommit. Why
  can't `refresh_continuous_aggregate` run inside a transaction?

**Understand — each migration:**

- `0002` — `create_hypertable('events', 'receivedAt', chunk_time_interval => '1 day')`.
  What is a chunk? Why partition on `receivedAt` (server time) rather than
  `timestamp` (client-reported)? What would a client with a wrong clock do to
  your chunks?
- `0003` — indexes are per-chunk, so they stay small as the table grows. Why does
  `(siteId, receivedAt DESC)` cover almost every dashboard query?
- `0004` — compression with `compress_segmentby = "siteId"` after 7 days. What
  does segmenting by site do to per-site query speed on compressed chunks? What
  can you no longer do to a compressed chunk?
- `0005` — retention drops raw events after 90 days. This drops *entire chunks*,
  not rows. Why is that so much faster than `DELETE`? And why is dropping raw
  data safe here? (Because of `0006`.)
- `0006` — this is the one to really sit with. `hourly_pageviews` is a continuous
  aggregate over raw events; `daily_pageviews` aggregates *the hourly view*, not
  raw events. Why chain them?
  - `materialized_only = true` on hourly: queries read only materialized data, so
    the last few minutes are missing. That's the reason realtime queries hit raw
    `events` instead. Trace that decision through `analytics.repository.ts`.
  - The refresh policy has `start_offset => '3 hours'`, `end_offset => '5 minutes'`.
    What does the 5-minute end offset protect against? (Hint: late-arriving events
    and the fact that a bucket must be closed before it's safe to materialize.)
  - `COUNT(DISTINCT visitorId)` inside an aggregate that you later `SUM()` — is
    that number correct? Think hard. Summing distinct counts across buckets
    over-counts a visitor seen in two hours. Decide whether you care, and note it.

**Checkpoint:** `pnpm db:migrate`, then compare:

```sql
EXPLAIN ANALYZE SELECT COUNT(*) FROM events WHERE "siteId" = '…';
EXPLAIN ANALYZE SELECT SUM(pageviews) FROM hourly_pageviews WHERE "siteId" = '…';
```
The second should be orders of magnitude cheaper. That gap is the whole point of
this step.

---

## Step 14 — Analytics query API

**Build:** `src/modules/analytics/` (types, repository, service, controller,
routes).

**Understand:**

- The repository is raw `$queryRaw` tagged templates, not the Prisma query
  builder. Why? (Prisma can't model continuous aggregates.) What makes the tagged
  template safe against injection, and what would break that safety?
- Every service function calls `verifySiteOwnership()` first. One extra query per
  request. Why not just add `userId` to the analytics WHERE clause?
- `resolveDateRange` defaults to the last 7 days. Where does that default live —
  service or controller — and why there?
- Every endpoint reads `hourly_pageviews` or `daily_pageviews`. Except
  `getRealtime`, which reads raw `events` with `receivedAt >= NOW() - '5 minutes'`.
  Read the comment above it. Connect this back to `materialized_only` in step 13.
- `app.ts` sets a `json replacer` that stringifies BigInt. Why does this API
  produce BigInts at all? (`SUM()` in Postgres → `bigint`. The `::int` casts in
  the SQL are the real fix; the replacer is the safety net.)
- The SSE endpoint (`/realtime/stream`): headers set, `flushHeaders()`, then a
  5s interval writing `data: …\n\n`, cleaned up on `req.on("close")`. Why verify
  ownership *before* flushing headers? (Once headers are out you can't send a
  403.) Why SSE and not WebSockets here?

**Checkpoint:**

```bash
curl "localhost:8000/api/v1/analytics/<siteId>/overview?from=2026-01-01" -H "authorization: Bearer <t>"
curl "localhost:8000/api/v1/analytics/<siteId>/timeseries?interval=day" -H "authorization: Bearer <t>"
curl -N "localhost:8000/api/v1/analytics/<siteId>/realtime/stream" -H "authorization: Bearer <t>"
```
The last one should stream a frame every 5 seconds.

---

## Step 15 — The SDK

**Build:** `sdk/` — `package.json`, `tsup.config.ts`, `src/tracker.ts`,
`src/session.ts`, `src/spa.ts`, `src/index.ts`, `src/react.ts`.

**Understand:**

- `session.ts` — visitor ID in `localStorage` (persists), session ID in
  `sessionStorage` (dies with the tab). That single storage choice *is* the
  definition of a session in this product. Both getters are wrapped in
  `try/catch` returning a fresh UUID — why? (Safari private mode, storage
  disabled, quota errors. Analytics must never throw on someone's site.)
- No cookies anywhere. What does that buy legally, and what does it cost you
  analytically? (Cross-subdomain and cross-browser identity.)
- `tracker.ts` uses `fetch(…, { keepalive: true })`. What does `keepalive` do on
  a page that's unloading? Why not `navigator.sendBeacon`?
- The fetch is wrapped in both a `.catch()` **and** a `try/catch`. Why both?
- `spa.ts` monkey-patches `history.pushState` and `replaceState` and listens for
  `popstate`. Why do you need all three to catch every route change? What's the
  risk of patching a global — what happens if two analytics SDKs both do this?
- The package exports three entry points (`.`, `./sdk`, `./react`) with separate
  ESM/CJS/types. Why is `react` a *peer* dependency, marked optional?

**Checkpoint:** `pnpm build` in `sdk/`, then an HTML file with a
`<script type="module">` calling `Pulse.init({ siteId, apiHost })`. Click around,
watch events land. This is your first real end-to-end run.

---

## Step 16 — Tests

**Build:** `vitest.config.ts`, `tests/unit/**`.

Read `docs/test-scope.md` for what got tested and — more usefully — what
deliberately didn't.

**Understand:** the unit tests cover pure logic: services (mocked repositories),
middleware, `app-error`, `ip`, `gen-tracking`, `geo.service`, the Zod schemas.
No controller tests, no DB integration tests. Argue whether that's the right line.

**Checkpoint:** `pnpm test` green.

---

## Step 17 — Load tests

**Build:** `tests/load/` — `seed-load-test.mjs`, `auth.yml`, `ingestion*.yml`,
`analytics.yml`.

**Understand:**

- The ingestion configs come in light/medium/heavy/hard tiers with different
  arrival rates. Why ramp rather than jump straight to the target?
- `RATE_LIMIT_ENABLED=false` in `load-test.env`. Obvious once you think about it —
  but note what you're no longer measuring when you disable it.
- The seed script pre-creates users and sites so the load test isn't measuring
  bcrypt. Which numbers would be meaningless without that?

**Checkpoint:** `pnpm load:seed && pnpm load:ingestion`. Watch p95/p99 and the
worker's queue-depth warnings. Find the point where the worker stops keeping up —
that number is the real output of this whole phase.

---

# Phase B — Frontend

Steps 18–20 are the minimal frontend: enough to prove the pipeline, ugly is fine.
21+ is polish.

## Step 18 — Next.js skeleton + API client

**Build:** `frontend/` scaffold, `lib/api/client.ts`, `lib/types/*`,
`app/providers.tsx`, `app/layout.tsx`.

**Understand:**

- The access token lives in a **module-level variable**, not localStorage. Why?
  (XSS: a token in localStorage is readable by any injected script. In a closure
  it isn't — at the cost of dying on refresh, which is what `/auth/refresh` on
  mount fixes.)
- The response interceptor returns `response.data`, so every call site gets the
  body directly. Convenient — but what does it cost you? (Status codes, headers.)
- The refresh flow: on 401, set `_retry`, refresh once, and queue every other
  concurrent 401 in `refreshQueue` to replay with the new token. Walk through what
  happens without that queue when five requests 401 simultaneously.
- `isRefreshEndpoint` guard — what infinite loop does it prevent?

## Step 19 — Auth pages

**Build:** `contexts/auth.context.tsx`, `app/(auth)/login`, `app/(auth)/register`,
`proxy.ts`.

**Understand:**

- The provider's mount effect calls `/auth/refresh` → `/auth/me` on *every* page
  load. That's the price of not persisting the token. Where does the loading
  flash come from and how would you kill it?
- `proxy.ts` (Next middleware) only checks whether the `refresh_token` cookie
  *exists* — it never verifies it. So it's a UX redirect, not a security boundary.
  Where is the actual boundary? (`authenticateToken` on the backend.) Be sure you
  believe that before moving on.

## Step 20 — Sites + a raw analytics page

**Build:** `lib/api/sites.api.ts`, `lib/api/analytics.api.ts`,
`hooks/useAnalytics.ts`, `app/dashboard/sites/`, `app/dashboard/sites/[id]/`.

Render numbers as plain text first — `<pre>{JSON.stringify(data, null, 2)}</pre>`
is fine. Charts come later.

**Understand:**

- Every hook has `staleTime: 60_000` except `useRealtime` (`staleTime: 0`,
  `refetchInterval: 30_000`). Why does one dataset get different caching?
- `useRealtimeStream` doesn't use `EventSource` — it uses `fetch` + a manual
  `ReadableStream` reader that splits on `\n` and parses `data: ` lines. Why?
  (`EventSource` can't send an `Authorization` header. That single limitation is
  the whole reason for that code.) What does the `AbortController` protect against?

**Checkpoint:** register → create site → paste the snippet into a test page →
click around → see numbers move on the dashboard. Pipeline closed. Everything
after this is presentation.

---

## Steps 21–24 — Polish

Order doesn't matter much here. Do them by appetite.

**21 — Design system.** Tailwind v4 + shadcn/ui, `components/ui/*`,
`globals.css` tokens, `next-themes` dark mode. Note `components/ui/*` is
generated by the shadcn CLI — regenerate rather than hand-copy, then diff against
`main` to see what you customised.

**22 — Dashboard shell.** `components/common/app-sidebar.tsx`, `site-header.tsx`,
`hooks/use-mobile.ts`, breadcrumbs, `app/dashboard/layout.tsx`.

**23 — Charts.** `components/analytics/*` on Recharts —
`timeseries-chart`, `top-pages-chart`, `referrers-chart`, `devices-chart`,
`geo-chart`, `overview-cards`, `date-range-bar`, `realtime-widget`.
Build `overview-cards` and `timeseries-chart` first; the rest are variations on
the same shape.

**24 — Landing page.** `components/landing/*` — the animated hero, ticker,
dashboard mockup, features, testimonials, CTA, footer. Pure presentation; leave
it last on purpose.

---

## Reference docs on `main`

Written while you built it the first time. Worth re-reading at the matching step:

| Doc | Read at |
|---|---|
| `docs/folder-structure.md` | step 1 |
| `docs/ingestion-api-architecture.md` | steps 7–11 (the deep one) |
| `docs/ingestion-api-build-guide.md` | steps 7–11 |
| `docs/analytics-query-build-guide.md` | steps 13–14 |
| `docs/analytics-backend-guide.md` | steps 5–6 |
| `docs/test-scope.md` | steps 16–17 |
| `docs/production-readiness.md` | after step 17 — it lists known gaps |
| `docs/aws-deployment.md` | if you redo deployment |

---

## Things worth changing this time

Not bugs — decisions you made once and can now reconsider with the whole system
in your head:

- `enqueue()` unawaited in the track controller — silent failure path.
- `validate()` handles bodies only; `/track` validates query params inline. Two
  patterns for one job.
- `SUM(COUNT(DISTINCT visitorId))` across buckets over-counts unique visitors.
- `asyncHandler` may be redundant under Express 5.
- Rate limiter fails closed, site cache fails open. Both defensible — but they
  should be a deliberate pair, not an accident.
- `uaCache` / `geoCache` clear wholesale instead of evicting.
- The GeoLite2 `.mmdb` is committed to the repo (~70MB of binary in git history).
