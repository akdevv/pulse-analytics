# Pulse Analytics — Remaining Work

Status snapshot (2026-08-02): core pipeline works end-to-end locally (SDK → ingestion → worker → TimescaleDB → dashboard). Backend deployed on Railway. Frontend not deployed. Landing page redesign in progress (uncommitted).

Ordered by phase. Each item names the files to touch.

---

## Phase 1 — UI gaps (biggest chunk)

### 1.1 Account page is unstyled

`frontend/app/dashboard/account/page.tsx` is raw HTML with inline `fontFamily: monospace` — no Card, no design system, no skeleton.

- [ ] Rebuild with `Card` + `Label` layout matching `app/dashboard/sites/[id]/settings/page.tsx`
- [ ] Use React Query (`useQuery`) instead of `useEffect` + `useState` + raw `api.get`
- [ ] Add `Skeleton` loading state, styled error state
- [ ] Wire the profile edit form — backend `PATCH /auth/me` exists (`backend/src/modules/auth/auth.routes.ts:27`) and has no UI at all
- [ ] Drop the dead `username` field from the local `User` interface (backend has `name`/`email` only)

### 1.2 Delete site has no confirmation

`frontend/app/dashboard/sites/[id]/settings/page.tsx:80` — `handleDelete` fires on a single click and permanently deletes a site plus its events.

- [ ] Add a confirm dialog (`@radix-ui/react-dialog` is already a dependency; no `Dialog` wrapper exists in `components/ui/` yet — add one)
- [ ] Same treatment for "Regenerate tracking key" — it silently invalidates every live snippet
- [ ] Consider requiring the site name typed to confirm (destructive-action pattern)

### 1.3 No dark/light mode toggle

README advertises dark mode. `next-themes` is installed but never wired: `frontend/app/layout.tsx:19` hardcodes `className="dark"` on `<body>`, and only `components/ui/sonner.tsx` calls `useTheme`. Light-mode tokens exist in `globals.css` but are unreachable.

- [ ] Add `ThemeProvider` from `next-themes` in `app/providers.tsx`
- [ ] Remove hardcoded `dark` class from `layout.tsx`
- [ ] Add a toggle in `components/common/site-header.tsx`
- [ ] Verify landing page + dashboard both read in light mode (landing was built dark-only)

### 1.4 Missing route-level states

No `error.tsx`, `loading.tsx`, or `not-found.tsx` anywhere in `frontend/app/`.

- [ ] `app/error.tsx` — global error boundary
- [ ] `app/not-found.tsx` — 404
- [ ] `app/dashboard/loading.tsx` — route-level skeleton
- [ ] `app/dashboard/sites/[id]/` — handle "site not found / not yours" (backend 404) distinctly from a load failure

### 1.5 Data fetching is inconsistent

Analytics uses React Query (`hooks/useAnalytics.ts`), but sites and account use hand-rolled `useEffect`.

- [ ] Move `components/sites/sites-list.tsx` to `useQuery` (drops manual loading state, gets caching + refetch)
- [ ] Same for `app/dashboard/sites/[id]/settings/page.tsx` and `setup/page.tsx`
- [ ] Invalidate the sites query after create/update/delete so the list is not stale
- [ ] `sites-list.tsx:19` swallows fetch errors into `console.error` — show an error state

### 1.6 Breadcrumbs show "Details" instead of the site name

`frontend/components/common/site-header.tsx:41` — any UUID segment renders as the literal string "Details".

- [ ] Resolve the site name from the sites query cache and use it in the crumb

### 1.7 Empty / zero-data states

Charts render with `isLoading` and `error` branches, but a site with zero events shows empty charts with no explanation.

- [ ] Add an explicit "No data yet — install the snippet" state across `components/analytics/*`, linking to the site's setup page
- [ ] Verify against a freshly created site (seeded DB always has data, so this path is untested)

### 1.8 Landing page redesign — finish and commit

Uncommitted: ~880 lines changed across `frontend/components/landing/*` + `globals.css`.

- [ ] Finish the in-progress pass, review it in light mode too (see 1.3)
- [ ] Check mobile breakpoints on hero, ticker, dashboard-mockup
- [ ] Commit — it has been sitting in the working tree

### 1.9 Polish / metadata

- [ ] No favicon — `frontend/public/` only holds `hero-bg.jpeg`
- [ ] No OG image or `openGraph` metadata in `app/layout.tsx` (matters for a public launch)
- [ ] Test the dashboard at mobile widths — sidebar uses `SidebarProvider` + `Sheet`, but the analytics grids were only checked wide

---

## Phase 2 — Bugs found while auditing

### 2.1 `runRawQuery` calls a route that does not exist

`frontend/lib/api/analytics.api.ts:38` POSTs to `analytics/:siteId/raw-query`. Backend only has `GET /:siteId/raw` (`backend/src/modules/analytics/analytics.routes.ts:25`). Nothing calls this function today.

- [ ] Either delete it, or build the endpoint if it is the seed of the AI-query feature (Phase 4)

### 2.2 Setup page ships a snippet pointing at a domain that is not yours

`frontend/app/dashboard/sites/[id]/setup/page.tsx:33` hardcodes `https://api.pulse.com/pulse-sdk.js`. The real SDK is `@akdevv/pulse` on npm, and the host should come from `NEXT_PUBLIC_API_URL`. This is item #5 in `docs/production-readiness.md`.

- [ ] Replace with the npm snippet + a self-hosted script URL derived from env
- [ ] Verify the copy-paste snippet actually tracks against a running backend

### 2.3 Local dev setup is broken as documented

`backend/README.md:44` says `prisma migrate deploy` then `pnpm db:migrate`. On a clean DB the TimescaleDB migration runner creates `schema_migrations` first, which makes Prisma bail with `P3005` (schema not empty).

- [ ] Fix the documented order, or have `db/migrate.ts` skip the bootstrap when Prisma has not run yet
- [ ] `docker-compose.yml` volume mount fix (pg18 wants `/var/lib/postgresql`, not `.../data`) is already applied but uncommitted — commit it
- [ ] `pnpm seed` then `tsx src/seed/fake-events.ts` should be one documented command; fake-events has no package script

---

## Phase 3 — Backend production readiness

`docs/production-readiness.md` lists 18 items. Several are already done (auth rate limiting, graceful shutdown, request IDs, Docker non-root + HEALTHCHECK). Remaining, verify each before starting:

- [ ] Re-audit the doc and tick off what is already shipped — the doc is stale
- [ ] P0 #1 — worker loses events on process crash (BullMQ job retention / ack strategy)
- [ ] P0 #2 — rate limiting fails open when Redis is down
- [ ] P1 #7 — error tracking (Sentry) is not wired
- [ ] P1 #8 — JWT revocation on logout (tokens stay valid until expiry)
- [ ] P1 #9 — date validation in analytics queries
- [ ] P1 #10 — password complexity rules
- [ ] P1 #11 — cache stampede on site lookup
- [ ] P2 #14 — GeoIP private-IP detection bug
- [ ] P2 #15 — UAParser instantiated per event (hot path)
- [ ] P2 #16 — tracking ID entropy loss
- [ ] P2 #17 — `trust proxy` too permissive
- [ ] P2 #18 — soft deletes for sites

### Tests

16 unit test files exist (`backend/tests/unit/`). No integration tests, no frontend tests.

- [ ] Add `backend/tests/integration/` — auth flow, site CRUD, ingestion → worker → DB round trip
- [ ] Coverage targets are in `docs/production-readiness.md:546`
- [ ] Decide whether the frontend gets any tests at all (currently zero)

---

## Phase 4 — Launch (from `docs/plan.md`)

### 4.1 E2E demo site

`docs/plan.md` Phase 1 assumes a `test-site/` directory. **It does not exist in this repo** — decide whether to create it or point the plan at something else.

- [ ] Create/locate the demo site, depend on `@akdevv/pulse` from npm (not `file:../sdk`)
- [ ] Register a real site against the Railway backend, grab the tracking ID
- [ ] Deploy to Vercel with `NEXT_PUBLIC_PULSE_SITE_ID` + `NEXT_PUBLIC_PULSE_HOST`
- [ ] Verify events land: backend logs → Redis queue → DB rows → dashboard

### 4.2 Deploy the dashboard

The frontend is not deployed anywhere; only the backend is on Railway.

- [ ] Deploy `frontend/` to Vercel, set `NEXT_PUBLIC_API_URL` to the Railway URL
- [ ] Set `FRONTEND_URL` on the backend for CORS
- [ ] Confirm cookie/refresh-token auth works cross-origin in production (it is only proven on localhost)

### 4.3 10k RPS load test

Artillery scripts are ready in `backend/tests/load/` (`ingestion-hard.yml` is new and uncommitted).

- [ ] Run against the live backend, 10k RPS sustained for 20 min
- [ ] Capture error rate, p95/p99, DB write throughput, Redis queue depth
- [ ] Commit the uncommitted load-test changes (`ingestion.yml`, `seed-load-test.mjs`, `ratelimit.ts`)

### 4.4 Case study write-up

- [ ] `docs/case-study.md` — architecture, load-test setup, results, bottlenecks, infra cost

### 4.5 AI-powered queries (stretch)

Natural language → validated SQL over analytics data. See 2.1 — `runRawQuery` is a leftover stub for this.

- [ ] Scope it before building: read-only SQL, allowlisted tables, per-site scoping, query timeout

---

## Phase 5 — Docs

- [ ] README roadmap checkboxes are all unticked and now out of date
- [ ] `docs/production-readiness.md` needs a pass for what is already fixed
- [ ] `docs/plan.md` Phase 1 Steps 2–5 reference a `test-site/` that is not in the repo
- [ ] Document the seed credentials for local dev (all seeded users use `password123`, `backend/src/seed/index.ts:19`)
