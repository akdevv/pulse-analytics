# Pulse Analytics — E2E Test Plan

## Goal
Deploy test-site to Vercel pointing at a live backend, verify the full analytics flow works end-to-end. Then run 10k RPS load test and write case study.

---

## Phase 1 — E2E Smoke Test

### Step 1 · Host the backend

Backend needs: Node API + TimescaleDB (Postgres) + Redis.

**Recommended: Railway**
- Free tier, supports Docker Compose, managed Postgres + Redis addons
- ~5 min to provision

**Alternatives:** Render (free, slow cold starts), Fly.io (more control)

Tasks:
- [ ] Create Railway project
- [ ] Add managed Postgres (TimescaleDB image or standard Postgres)
- [ ] Add managed Redis
- [ ] Set env vars (DATABASE_URL, REDIS_URL, PORT, etc.)
- [ ] Deploy backend — get public URL

### Step 2 · Fix SDK import in test-site

test-site currently uses a local file reference that Vercel can't resolve:
```json
"@pulse/sdk": "file:../sdk"
```

Switch to published npm package:
```json
"pulse-analytics": "^0.1.2"
```

Update all imports in test-site:
- `from "@pulse/sdk/react"` → `from "pulse-analytics/react"`
- `from "@pulse/sdk"` → `from "pulse-analytics"`

Tasks:
- [ ] Update package.json dependency
- [ ] Update imports in `app/analytics.tsx`
- [ ] Verify build passes locally

### Step 3 · Create a site via backend API

Before deploying, need a real `siteId`:
- [ ] Hit `POST /sites` on the live backend to register a site
- [ ] Save the returned `siteId`

### Step 4 · Deploy test-site to Vercel

Set env vars in Vercel dashboard:
- `NEXT_PUBLIC_PULSE_SITE_ID` — from Step 3
- `NEXT_PUBLIC_PULSE_HOST` — Railway URL from Step 1

Tasks:
- [ ] Connect test-site repo to Vercel (set root dir to `test-site/`)
- [ ] Set env vars
- [ ] Deploy

### Step 5 · Verify E2E

- [ ] Visit Vercel URL, navigate across pages
- [ ] Check backend logs — events should arrive
- [ ] Check DB — rows should be written
- [ ] Optionally: check frontend dashboard if it exists

---

## Phase 2 — Load Test (10k RPS / 20 min)

> Start after Phase 1 is confirmed working.

- [ ] Run existing Artillery load test scripts against live backend
- [ ] Target: 10,000 RPS sustained for 20 minutes
- [ ] Monitor: error rate, p95/p99 latency, DB write throughput, Redis queue depth
- [ ] Collect Artillery HTML/JSON report

Scripts already exist at `backend/tests/load/`.

---

## Phase 3 — Case Study Report

> Start after Phase 2 passes.

Report should cover:
- Architecture overview (SDK → backend → TimescaleDB + Redis)
- Load test setup (Artillery config, RPS ramp, duration)
- Results (throughput, latency percentiles, error rate, infra cost)
- Bottlenecks found + fixes applied (if any)
- Conclusion

Deliverable: `docs/case-study.md` or PDF.

---

## Current Status

| Phase | Status |
|-------|--------|
| Phase 1 — E2E Smoke Test | Not started |
| Phase 2 — Load Test | Not started |
| Phase 3 — Case Study | Not started |
