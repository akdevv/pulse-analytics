# Next Steps

Where the rebuild stands and what to do next, in order.

## Where we are

Backend and frontend are both working end to end locally.

- **Backend** — auth, sites, ingestion, analytics, worker, health checks. All routes mounted.
- **Frontend** — landing, login/register, dashboard, per-site analytics, site setup flow.
- **Infra** — TimescaleDB + Redis in docker, both migration systems run, GeoIP loaded.
- **Tests** — 15 unit test files. No integration, load, or frontend tests.

The gap: everything works *except* a real website can't actually send events yet.

---

## 1. Housekeeping (quick, do first)

Small things that will bite later if left.

- [x] ~~Fix `pnpm typecheck`~~ — done. `track.service.test.ts` mock was missing `ep`/`ts`; they run through `.transform()`, so the inferred type needs them present even when undefined. `tsc --noEmit` is clean.
- [ ] Add `db:migrate` and `db:seed` scripts to `backend/package.json`. The README tells people to run `pnpm db:migrate` and it doesn't exist.
- [ ] Add a `docs/` folder or fix the README links — it points at `docs/plan.md`, `docs/ingestion-api-architecture.md` and `docs/screen-hero.png`, none of which exist.

## 2. Build the SDK

**This is the real blocker.** `sdk/` doesn't exist in the rebuild yet.

The site setup page hands users this snippet:

```html
<script src="https://api.pulse.com/pulse-sdk.js?trackingId=..."></script>
```

Nothing serves that file. Until it exists, the only way events reach `/track` is curl — the product doesn't work for an actual user.

Scope it small:

- [ ] Pageview tracking on load
- [ ] SPA route-change detection (patch `history.pushState`, listen for `popstate`)
- [ ] Custom events — `Pulse.track(name, props)`
- [ ] `usePulse` React hook
- [ ] Build with tsup, dual entry (vanilla + react), zero dependencies
- [ ] Decide how it gets served: bundled into the backend as a static file is simplest, npm/CDN later

Then verify the full loop yourself: drop the script on a scratch HTML page → event lands in `events` → dashboard chart moves.

## 3. Integration tests

`supertest` is already installed and unused. Unit tests cover services in isolation; nothing tests a real request through the middleware stack.

Worth covering:

- [ ] Auth flow — register → login → refresh → protected route
- [ ] Ingestion — valid event enqueues, invalid one 400s, rate limit 429s
- [ ] Sites — CRUD, and that one user can't read another user's site
- [ ] Analytics — endpoints return the right shape against seeded data

That last group needs a test database. Simplest path is a second docker compose service on another port, migrated and torn down per run.

## 4. Load testing

`backend/tests/load/` is empty but the README claims 10k RPS. Make it true or drop the claim.

- [ ] Artillery script hitting `/track`
- [ ] Measure: p95 latency, queue depth, error rate
- [ ] Find where it actually breaks, write down the number
- [ ] Tune from there — batch size, worker concurrency, connection pool

Run it against `RATE_LIMIT_ENABLED=false` or you're just load-testing the rate limiter.

## 5. Ship it

- [ ] GitHub Actions — typecheck, lint, test on push
- [ ] Deploy backend (Railway, per the README) + worker as a separate process
- [ ] Deploy frontend to Vercel, point `NEXT_PUBLIC_API_URL` at the live API
- [ ] Managed Postgres/Redis, real secrets, `RATE_LIMIT_ENABLED=true`
- [ ] Public demo site sending real traffic to the live backend

## 6. Later

Not now, but the interesting parts:

- Load-test case study write-up
- AI queries — natural language → validated SQL over the analytics data
- Retention policies and compression tuning as data grows

---

## Suggested order

1 → 2 → 3 → 4 → 5. Step 2 is the one that turns this from "services that run" into "a product that works", so don't let it slip behind the test work.
