# Next Steps

Where the rebuild stands and what to do next, in order.

## Where we are

Backend, frontend and SDK all run locally.

- **Backend** — auth, sites, ingestion, analytics, worker, health checks. All routes mounted.
- **Frontend** — landing, login/register, dashboard, per-site analytics, site setup flow. Functional, not good yet.
- **SDK** — ported from the previous implementation. `pulse.js` served from the API host, verified end to end.
- **Infra** — TimescaleDB + Redis in docker, both migration systems run, GeoIP loaded.
- **Tests** — 15 unit test files, Artillery load configs copied over. No integration or frontend tests.

The full pipeline works: a real page sends events and the dashboard shows them.

Next real gap: no AI query feature, nothing proven under load, and the frontend is rough.

---

## 0. Housekeeping

Small, do them whenever they get annoying.

- [x] ~~Fix `pnpm typecheck`~~ — `track.service.test.ts` mock was missing `ep`/`ts`; they run through `.transform()`, so the inferred type needs them present even when undefined.
- [x] ~~Add `db:migrate` and `db:seed` scripts to `backend/package.json`~~ — `db:migrate` runs prisma deploy + `db/migrate.ts`, same as `dev.sh`.
- [x] ~~Add the `load:*` scripts to `backend/package.json`~~ — `load:light|medium|heavy|hard|auth|analytics`, each writes JSON to `tests/load/reports/`. Needs artillery on PATH.
- [x] ~~Fix the README links~~ — dead `docs/` links and the Railway claim removed; roadmap now points at this file.

## 1. Build the SDK — done

Ported from the previous implementation rather than rewritten.

- [x] Pageview tracking on load
- [x] SPA route-change detection (`history.pushState` patch + `popstate`)
- [x] Custom events — `Pulse.trackEvent(name, props)`
- [x] `usePulse` React hook
- [x] tsup build, dual entry (vanilla + react), zero dependencies
- [x] Serving — `pulse.js` lives in `backend/public/`, served from the API host with open CORS
- [x] Setup page snippet fixed — it pointed at a nonexistent `api.pulse.com/pulse-sdk.js` and passed the tracking ID as a query param the script never read. Now uses `data-tid`/`data-host`.
- [x] **Verified end to end** — scratch HTML page → `/track` → queue → worker → `events` → dashboard. Pageviews, SPA route changes and back-button navigation all land, with `visitorId`/`sessionId` set.

Two things that came out of the verification:

- Fixed stale dashboard numbers. Both continuous aggregates were created `materialized_only = true`, so queries returned only pre-computed rows and the refresh job runs hourly — new events were invisible for up to an hour while the realtime widget (which reads raw `events`) showed them immediately. `0007_realtime_aggregates.sql` turns on real-time aggregation.
- `helmet()` sets `script-src 'self'` on everything the API serves, so inline scripts on any page served from `backend/public/` are blocked. Worth knowing when writing another test page.

Notes: `sdk/` uses npm, not pnpm, unlike the rest of the repo. Customer sites with a strict CSP will need the API host allowlisted in `script-src` and `connect-src` — worth documenting on the setup page.

## 2. AI SQL queries

The differentiator. User asks a question in English, we generate SQL, run it read-only, render the answer.

- [ ] Read-only Postgres role — `SELECT` on `events`/`sites` only, `statement_timeout`, its own connection pool
- [ ] Schema prompt — hand the model the columns it may touch, not the whole DB
- [ ] Guardrails before execute — single `SELECT`, no CTE writes/DDL/DML, forced `site_id` filter for the caller's site, forced `LIMIT`
- [ ] `POST /api/v1/sites/:id/ask` — question in, `{sql, rows, explanation}` out
- [ ] Frontend — ask box on the site dashboard, table result, chart when the shape is time series, show the generated SQL
- [ ] Cost control — rate limit per user, cache identical questions
- [ ] Tests — the validator is the security boundary, so it gets real tests (injection attempts, cross-site reads, write statements)

## 3. Git hooks

Stop broken code reaching commits. Cheap and pays back immediately.

- [ ] husky + lint-staged
- [ ] pre-commit — prettier + eslint on staged files only
- [ ] pre-push — typecheck + tests, both workspaces
- [ ] Keep pre-commit fast; slow hooks get bypassed with `--no-verify`

## 4. Local testing

Everything provable on your own machine before paying for infrastructure.

**Integration tests** — `supertest` is installed and unused. Unit tests cover services in isolation; nothing tests a real request through the middleware stack.

- [ ] Auth flow — register → login → refresh → protected route
- [ ] Ingestion — valid event enqueues, invalid one 400s, rate limit 429s
- [ ] Sites — CRUD, and that one user can't read another user's site
- [ ] Analytics — endpoints return the right shape against seeded data
- [ ] Test database — second docker compose service on another port, migrated and dropped per run

**Load tests, local** — the Artillery configs are copied in (`ingestion` light/medium/heavy/hard, `auth`, `analytics`, plus `seed-load-test.mjs`). None have been run yet.

- [x] ~~Artillery scripts hitting `/track`~~ — copied from the previous implementation
- [ ] Wire up the `load:*` npm scripts, then actually run them
- [ ] Measure p95 latency, queue depth, error rate
- [ ] Find where your laptop breaks and write the number down — it's the baseline the AWS run gets compared against
- [ ] Tune what's cheap to tune: batch size, worker concurrency, connection pool

Run with `RATE_LIMIT_ENABLED=false` or you're just load-testing the rate limiter.

## 5. Hosting + CI/CD

- [ ] GitHub Actions — typecheck, lint, test on every push
- [ ] Deploy backend to AWS, worker as its own process (not a thread of the API)
- [ ] Managed Postgres (Timescale Cloud) + Redis (ElastiCache) — `.env.example` already assumes this shape
- [ ] Frontend on Vercel, `NEXT_PUBLIC_API_URL` pointed at the live API
- [ ] Real secrets, `RATE_LIMIT_ENABLED=true`, CORS locked to the frontend domain
- [ ] Auto-deploy on merge to main
- [ ] Public demo site sending real traffic

## 6. The 10k RPS run

The headline number. Only meaningful on real infrastructure, sustained — 30 minutes, not 30 seconds.

- [ ] Distributed load generation — one box can't produce 10k RPS honestly
- [ ] Sustain 10k RPS for 30 min, watch for degradation over time, not just peak
- [ ] Track throughout: p50/p95/p99, error rate, queue depth, DB write lag, CPU/memory
- [ ] Confirm the queue drains after the run — backlog that never clears means the worker is the ceiling
- [ ] Record what broke first and what you changed
- [ ] Drop the aggregate `schedule_interval` from 1 hour first — real-time aggregation live-computes everything since the last refresh, which at 10k RPS is ~36M rows per query

Capture the graphs while it runs. You can't reconstruct them afterwards, and they're the case study.

## 7. Case study

Once the number is real, write it up. This is the part that makes the project worth showing.

- [ ] Architecture and why the hot path is thin
- [ ] Load test methodology and results, with the graphs
- [ ] What broke, what you tuned, what the ceiling was
- [ ] Cost per million events

## 8. Frontend UI/UX polish (last)

Deliberately last. Everything else is either the product working or the number that makes the project worth showing; polish is the coat of paint on top.

- [ ] Pick the visual direction first (spacing, type scale, color) and apply it everywhere — piecemeal tweaks won't fix "feels cheap"
- [ ] Loading states — skeletons instead of layout jumps
- [ ] Empty states — new site with no events should teach, not show a blank chart
- [ ] Error states — failed queries currently just vanish
- [ ] Chart polish — axis formatting, tooltips, sensible number/date rendering
- [ ] Mobile — the dashboard is desktop-only right now
- [ ] Onboarding flow — new user → site created → snippet installed → first event, without confusion

---

## Order

~~0~~ → ~~1~~ → 2 → 3 → 4 → 5 → 6 → 7 → 8.

**Next up: AI SQL queries.**

AI queries first because they're the feature nothing else has. Hooks before testing so the tests stay green. Everything provable locally before AWS costs money. UI polish last — it's the only item that doesn't block anything downstream.
