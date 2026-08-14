# Next Steps

Where the rebuild stands and what to do next, in order.

## Where we are

Backend and frontend both run end to end locally.

- **Backend** — auth, sites, ingestion, analytics, worker, health checks. All routes mounted.
- **Frontend** — landing, login/register, dashboard, per-site analytics, site setup flow. Functional, not good yet.
- **Infra** — TimescaleDB + Redis in docker, both migration systems run, GeoIP loaded.
- **Tests** — 15 unit test files. No integration, load, or frontend tests.

The gap: everything works *except* a real website can't actually send events yet.

---

## 0. Housekeeping

Small, do them whenever they get annoying.

- [x] ~~Fix `pnpm typecheck`~~ — `track.service.test.ts` mock was missing `ep`/`ts`; they run through `.transform()`, so the inferred type needs them present even when undefined.
- [ ] Add `db:migrate` and `db:seed` scripts to `backend/package.json` — the README tells people to run `pnpm db:migrate` and it doesn't exist.
- [ ] Add a `docs/` folder or fix the README links — it points at `docs/plan.md`, `docs/ingestion-api-architecture.md` and `docs/screen-hero.png`, none of which exist.

## 1. Build the SDK

**The real blocker.** `sdk/` doesn't exist in the rebuild.

The site setup page hands users this snippet:

```html
<script src="https://api.pulse.com/pulse-sdk.js?trackingId=..."></script>
```

Nothing serves that file. Until it exists the only way events reach `/track` is curl — the product doesn't work for an actual user.

- [ ] Pageview tracking on load
- [ ] SPA route-change detection (patch `history.pushState`, listen for `popstate`)
- [ ] Custom events — `Pulse.track(name, props)`
- [ ] `usePulse` React hook
- [ ] Build with tsup, dual entry (vanilla + react), zero dependencies
- [ ] Decide how it's served — bundled into the backend as a static file is simplest, npm/CDN later

Verify the whole loop yourself: script on a scratch HTML page → row in `events` → dashboard chart moves.

## 2. Frontend UI/UX pass

Currently barely functional. Now that the data flow works, make it something worth showing.

- [ ] Pick the visual direction first (spacing, type scale, color) and apply it everywhere — piecemeal tweaks won't fix "feels cheap"
- [ ] Loading states — skeletons instead of layout jumps
- [ ] Empty states — new site with no events should teach, not show a blank chart
- [ ] Error states — failed queries currently just vanish
- [ ] Chart polish — axis formatting, tooltips, sensible number/date rendering
- [ ] Mobile — the dashboard is desktop-only right now
- [ ] Onboarding flow — new user → site created → snippet installed → first event, without confusion

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

**Load tests, local** — `backend/tests/load/` is empty.

- [ ] Artillery script hitting `/track`
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

Capture the graphs while it runs. You can't reconstruct them afterwards, and they're the case study.

## 7. Case study

Once the number is real, write it up. This is the part that makes the project worth showing.

- [ ] Architecture and why the hot path is thin
- [ ] Load test methodology and results, with the graphs
- [ ] What broke, what you tuned, what the ceiling was
- [ ] Cost per million events

## Optional, later

**Natural language queries** — user asks a question, you generate SQL, run it, render the result in the format they want.

Worth doing only after everything above. The hard part isn't generating SQL, it's making sure generated SQL can't read another user's data or table-scan the whole hypertable — read-only role, forced `siteId` filter, statement timeout, validate before execute.

---

## Order

1 → 2 → 3 → 4 → 5 → 6 → 7.

The SDK first because nothing else is real without it. UI second because the case study needs screenshots. Hooks before the test work so the tests stay green. Everything provable locally before AWS costs money.
