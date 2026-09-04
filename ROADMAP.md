# Pulse Analytics — Roadmap

Everything in one place: what we're building, the two tests that decide whether it's finished, what's missing today, and the schedule.

Day-to-day checklist is `todos.md` (gitignored). This file is the plan.

---

## 1. What this is

Privacy-friendly web analytics: a hosted dashboard plus a tiny SDK. No cookies, no third parties. A tiny SDK posts events to an ingestion endpoint that does almost nothing — validate, rate-limit, enqueue — while a worker enriches and batch-writes into TimescaleDB, and a Next.js dashboard reads the aggregates back out.

It was built to learn how a high-throughput ingestion pipeline fits together. That objective is met. What's left is making it a tool rather than a repo.

### Where it stands

| Piece | State |
|---|---|
| SDK | `@akdevv/pulse` on npm (v0.1.4). Pageviews, SPA route changes, custom events, React hook. |
| Ingestion | Redis rate limiting, Zod validation, BullMQ enqueue. Works. |
| Worker | UA parsing, GeoIP, batched writes. Works. |
| Analytics API | Overview, timeseries, pages, referrers, devices, geo, realtime SSE. Works. |
| Dashboard | Auth, sites, per-site analytics, setup page. Functional, unpolished. |
| Custom events | Ingested and stored. **Never displayed anywhere.** |
| Docs | An SDK README. Nothing else. |
| Deployment | None. Local docker only. |
| Load testing | Configs written, never run. |

---

## 2. Definition of done

Two tests. Both have to pass, or the project isn't finished in any sense worth claiming.

**Test 1 — a real developer can adopt it.** Someone lands on the site, signs up, installs it on a live site (`akdevv.com` is the guinea pig), and sees their pageviews and button clicks in the dashboard, using only the documentation. No repo spelunking, no asking the author.

**Test 2 — the throughput claim is verified.** A number we measured ourselves, under stated conditions, with graphs and a method someone else could repeat.

Everything below serves one of those two.

---

## 3. Test 1 — the adoption walkthrough

The journey, as the dev experiences it, with what's missing at each step.

### Step 1 — land on the site, understand what it is

Currently: a landing page, no docs link, no live demo.

Missing:
- Docs, linked from the nav
- A "see it live" link to the demo dashboard so they can judge it before signing up

### Step 2 — sign up, create a site

Currently: works. Register, create a site with a name and domain, get a tracking ID.

Missing: nothing important. This step is fine.

### Step 3 — install the snippet

Currently: the setup page shows a `<script>` tag with `data-tid` and `data-host`, and a curl command for a smoke test.

For `akdevv.com` specifically — an Astro site — the snippet goes in the `<head>` of the base layout. Astro is multi-page by default, so every navigation is a real page load and fires its own pageview. The SPA route-change logic only matters if View Transitions are enabled.

Missing:
- **Framework install guides.** "Paste it in `<head>`" is not enough. Astro, Next.js App Router, plain HTML, and React/Vite each need five lines of specific instruction.
- **The npm path is undocumented in the app.** `npm i @akdevv/pulse` then `Pulse.init({ siteId, apiHost })` is the better route for a framework site, and the setup page never mentions it exists.
- **CSP note.** A site with a strict Content-Security-Policy needs the API host in `script-src` and `connect-src`. Right now it just silently fails.
- **Confirm the published npm build matches `sdk/src`.** v0.1.4 was published before recent changes; republish if it drifted.

### Step 4 — verify it's working

Currently: nothing. You paste the snippet, then go stare at the dashboard and hope.

Missing:
- **A "waiting for your first event" state on the setup page** that polls and flips to "connected" when the first event lands. This is the single highest-value missing piece in the whole flow — it's the moment the dev decides whether the tool works.
- A troubleshooting list: wrong tracking ID, ad blocker, CSP, snippet in `<body>`, domain mismatch.

### Step 5 — track button clicks

Currently: `Pulse.trackEvent('name', { props })` exists in the SDK and the payload reaches the database.

Missing, and this is the big one:
- **Automatic click tracking.** Real tools let you add `data-pulse-event="hire_me_click"` to a button and be done. A delegated click listener in the SDK is about twenty lines and removes the need to write JavaScript on an Astro site at all.
- **Custom events are invisible.** The events are stored, and there is no endpoint, no query, and no UI that shows them. `eventName` appears nowhere in the analytics module. So today: the dev tracks a click, the click is saved, and they can never see it. This has to be built:
  - `GET /analytics/:siteId/events` — event names with counts over a range
  - Breakdown by property value for a single event name
  - A card in the dashboard, and the events showing up in the realtime widget

### Step 6 — read reports over time

Currently: overview cards, timeseries, top pages, referrers, devices, geo, realtime. Solid coverage for pageviews.

Missing:
- Custom events (above)
- Nothing else blocking. Comparison to previous period would be nice, and is not required to pass Test 1.

### The pass condition for Test 1

`akdevv.com` running Pulse in production, `data-pulse-event` on at least one real button, and the dashboard showing pageviews, referrers, and named click events from real visitors — installed by following the docs, not from memory.

---

## 4. Documentation

Without docs, it reads as a repo. With them, it reads as a tool. Four pages, written as MDX in the dashboard app under `/docs` (Shiki is already installed for code highlighting).

1. **Quickstart** — create a site, install the snippet, verify the first event. Under two minutes end to end.
2. **Install guides** — script tag, npm + `Pulse.init`, Astro, Next.js App Router, React/Vite. Copy-pasteable, one block each.
3. **Tracking events** — `data-pulse-event` attributes, `Pulse.trackEvent`, the `usePulse` hook, property naming, what not to put in properties (nothing personal).
4. **How it works** — the pipeline end to end: why the hot path only validates and enqueues, what the worker does, how the aggregates are built. This is the page that makes an engineer trust the tool, and it doubles as the case-study skeleton.

Plus: `sdk/README.md` refreshed (it's the npm listing page) and the root `README.md` rewritten around the live link and real numbers.

Reference material — the full API surface, the tracking parameters — goes in the repo as markdown. Not worth building a docs site for.

---

## 5. Test 2 — verifying the 10k RPS claim

The claim being tested: **10,000 events per second, sustained, accepted and stored without loss.** A number without conditions attached is marketing, so the finished claim names the hardware, the duration, the latency percentiles, and the error rate.

### What has to be true

- Sustained for 30 minutes, not a 30-second spike. Degradation over time is the thing being looked for.
- 429s and connection errors are failures, not successes. Rate limiting is disabled or set to a test tier for the run — **and the write-up says so plainly.** The per-site tiers max out at 100k/min, which is well under 600k/min, so the run cannot be done with them on.
- The queue drains after the run. A backlog that never clears means the worker is the real ceiling and the endpoint was just writing cheques Redis couldn't cash.
- **Rows in equal rows out.** Sent 18 million events, `SELECT count(*)` returns 18 million. This is the strongest evidence in the whole exercise — it proves the pipeline, not just the endpoint.

### Doing it in tiers

**Tier 0 — laptop ceiling (free, half a day).** One API process, docker Postgres and Redis, load generated on the same machine. Establish where a single instance breaks and what breaks first: event loop, Redis round-trips, worker batch writes, or the connection pool. Note that the generator competes with the target for CPU here, so this number is a floor, not a result.

**Tier 1 — one cloud box, honest generation (a few dollars).** Target on its own instance; load generated from separate instances in the same region. Artillery is Node-based and struggles to produce serious load from one machine — for the real runs use `k6` or `bombardier`, which will saturate a NIC before they saturate a CPU. Same test as Tier 0, without the contention. This is the number that goes on the portfolio if Tier 2 doesn't happen.

**Tier 2 — the actual 10k claim (a day, tens of dollars, torn down after).** Several API instances behind a load balancer, Redis and Timescale sized for it, and three to five generator instances in the same region driving traffic together. One box cannot honestly produce 10k RPS.

Money-wise this is much smaller than it sounds: a handful of instances for a few hours, deleted the same day. The expensive version is leaving it running.

### What to record, live

p50/p95/p99 latency measured at the generator, error rate by status code, throughput accepted, Redis queue depth over time, worker batch-write lag, CPU and memory on every box, and row count in the database before and after.

Screenshot the graphs while they run. They cannot be reconstructed afterwards, and they are the case study.

### The pass condition for Test 2

Either 10k RPS sustained for 30 minutes with the queue draining and row counts matching — claim verified, publish it — or a lower number that we actually hit, published with the same rigour and the ceiling explained. **Both outcomes are a pass.** "It handled 3,200 RPS on a single 2-vCPU instance, and here's what broke first" is a better portfolio artifact than an unverified 10k.

What isn't acceptable is the current state: the number on the portfolio with nothing behind it.

---

## 6. What we're skipping

Written down so it stops being reconsidered.

- AWS, Terraform, ECS, "microservices". It's an API and a worker. Call it that.
- Comprehensive test coverage. Four integration flows: auth, ingestion, site isolation, analytics shapes.
- Mobile app, email verification, billing, multi-region, the Go rewrite.
- A dedicated docs site. Four pages in the app is enough.
- Self-hosting as a pitch. It runs in docker and always will, but the product being shown is the hosted dashboard. No self-host guide, no "deploy your own" button.
- Any feature not already in the repo, except: AI SQL queries, custom-event reporting, and `data-pulse-event` click tracking.

---

## 7. Hosting and cost

Two environments, and they are not the same machine.

- **The demo** — always up, tiny traffic, has to look instant when someone opens the link. Optimised for costing nothing.
- **The load rig** — exists for a few hours, gets hammered, then gets deleted. Optimised for being honest.

Never point a load test at the demo box. A free-tier box will fall over, and sustained egress on a free account is how accounts get suspended.

### What the backend actually needs

Four things running: the API, the worker, Postgres **with the TimescaleDB extension**, and Redis. That extension requirement rules out most free managed Postgres — Neon and Supabase don't offer TimescaleDB, and without hypertables and continuous aggregates half the project stops existing. Timescale Cloud has no permanent free tier, only a trial. So the realistic shape is one small box running everything from the compose file already in the repo.

### Free options for keeping it alive

| Option | Cost | Reality |
|---|---|---|
| **Oracle Cloud Always Free** (ARM Ampere, 4 cores / 24 GB) | $0 forever | Best fit. One VM runs the whole compose file with room to spare. Costs: account signup is fussy, ARM capacity in a given region can be unavailable for a while, and you're managing a VM — Caddy or nginx for TLS, and it's on you when it falls over. Confirm the TimescaleDB image has an arm64 build for the tag you're on. |
| **Google Cloud free tier** (e2-micro, 1 GB) | $0 forever | 1 GB is tight for Postgres + Redis + two Node processes. Doable with swap and small buffers, not comfortable. |
| **Fly.io** | ~$5–7/mo | Machines auto-stop when idle and wake on request, so the bill tracks usage. Cleanest developer experience of the paid options. Cold start on the first hit after idle — mildly bad for a demo link. |
| **Hetzner CX22** | ~$5/mo | Boring, reliable, generous. What I'd pick if Oracle's ARM capacity won't cooperate. |
| **Render / Railway free tiers** | $0–5 | Render's free web services sleep and take ~50 s to wake, and background workers aren't free — the worker is half this system. Railway's free allowance is a credit, not a tier. Both are poor fits here. |

**Recommendation:** Oracle Always Free, with Hetzner as the fallback if capacity blocks you. Frontend on Vercel free. Demo subdomain off `akdevv.com`, TLS via Caddy. Target: **$0/month, plus a few dollars of LLM spend.**

### The AI query feature

Per question: roughly 1.5k input tokens of schema prompt plus a few hundred out. On Opus that lands near 1–2 cents a query; caching the stable prompt prefix cuts the input side substantially. A $5 cap covers hundreds of demo queries, which is far more than a portfolio link will ever see. Set the cap on day one — the failure mode isn't per-query cost, it's a loop you didn't notice.

### The load test burn

Rough, on-demand, one region, everything torn down the same day. Verify current prices before committing — these move.

| Item | Shape | Approx |
|---|---|---|
| API instances | 3 × 2-vCPU ARM | ~$0.25/hr |
| Data layer | 1 × 4-vCPU for Postgres + Redis | ~$0.20/hr |
| Load generators | 4 × 4-vCPU, **spot** | ~$0.20/hr |
| Storage, transfer | Same-AZ traffic, small EBS | pennies |

So roughly **$0.60–0.70/hr for the whole rig**, meaning the actual 30-minute run costs well under a dollar. The money goes on the fumbling around it — expect a full day of setup, mistakes and reruns.

**Budget $30–50 for the entire load-testing exercise.** Guardrails: a billing alert before you launch anything, spot instances for generators, no load balancer (point generators straight at instance IPs — ALB charges scale with traffic and will surprise you at 10k RPS), and `terraform destroy` or the console equivalent the same evening. The one genuinely expensive mistake is leaving it running overnight.

### Total

| | |
|---|---|
| Demo, monthly | **$0** hosting, ~$1–5 LLM |
| Load testing, one-off | **$30–50** budgeted, likely less |
| Domain | Already owned |

---

### Demo mode — the exit plan

Two problems solved by one feature. Nobody browsing a portfolio will register an account to look at a dashboard, so the demo link is what most visitors actually see. And eventually you'll stop wanting to maintain a box — when that day comes, the link should keep working instead of rotting.

So: a `/demo` route reading a **snapshot of real data**. Once akdevv.com has been sending traffic for a week, export that window to JSON fixtures and serve the dashboard from them. Real numbers from real visitors, frozen in time.

Rules, all three non-negotiable:

- **Label it.** "Demo — snapshot data, September 2026", visible on the page. Frozen real data, stated as such, reads as honest engineering. Live-looking fabricated numbers read as a lie the moment someone asks "is this live?"
- **No dead ends.** Read-only. No create-site form that doesn't create, no settings that don't save. Disable them, don't fake them.
- **Don't fake the ask box.** It executes SQL against a real database. In snapshot mode either disable it with a note, or pre-record a few real questions with the SQL they generated and the rows they returned, labelled as recorded.

Order of operations: backend stays live through the September window and while the project is being actively shown — Test 1 can't pass without it, and the ingestion pipeline is the part worth demonstrating. Demo mode gets built during the UI days because it pays off immediately. Then the backend can be shut down whenever it stops being worth the upkeep, and nothing on the portfolio breaks.

What survives a shutdown: the demo link, the npm package, the repo, the case study, the load-test graphs. That's the whole portfolio entry.

---

## 8. Schedule

**10 Sept — workable.** **15 Sept — presentable.**

| Date | Work |
|---|---|
| **Sept 4** | Accounts first: LLM key with a spend cap, MaxMind license key, hosting account, DNS for the demo subdomain. Then AI SQL backend — migration, validator, runner, `/ask` endpoint. |
| **Sept 5** | AI SQL frontend, rate limit, cache, validator tests. Custom events: endpoint plus dashboard card. `data-pulse-event` click tracking in the SDK, republish to npm. |
| **Sept 6** | Deploy day, all of it. Node 22 image, GeoIP at build time, Timescale + Redis + API + worker, migrations, Vercel, secrets, CORS, health check green from the public internet. |
| **Sept 7** | Docs — four pages. Setup page "waiting for first event" state. Then install Pulse on `akdevv.com` **by following the docs**, and fix whatever that exposes. |
| **Sept 8** | Load testing: Tier 0 then Tier 1. Record everything, screenshot the graphs. |
| **Sept 9** | Tune what the load exposed — batch size, worker concurrency, pool. Integration tests. CI workflow. Sort out `main` vs `rebuild`. |
| **Sept 10** | **Checkpoint.** Test 1 passes. A real load number exists. Cut anything unfinished here rather than carrying it into the UI days. |
| **Sept 11–13** | UI: one visual direction applied everywhere, loading skeletons, empty states that teach, visible errors, chart polish, mobile, onboarding path. Plus demo mode — export a week of real akdevv.com traffic to fixtures and serve `/demo` from them, labelled and read-only. |
| **Sept 14** | Tier 2 load run if it's happening, then the case study: architecture, method, results, what broke first, cost per million events. |
| **Sept 15** | README, portfolio entry — `github`, `image`, `demo`, `wip` off — and the description rewritten to the number we actually measured. Click every link as a stranger would. |

---

## 9. Known traps

| Trap | Fix |
|---|---|
| `GeoLite2-City.mmdb` is 66 MB and gitignored — the deployed image has no GeoIP | MaxMind key, download at build time. If it fights back, ship with geo off and hide the card |
| `backend/Dockerfile` is on `node:20-alpine`; README says ≥22 and Prisma 7 wants it | Bump before deploying |
| The worker is a separate process, not a thread of the API | Second service, same image, different start command |
| Free-tier Redis (10k commands/day) won't survive demo traffic, let alone load tests | Redis container alongside the API |
| `origin/main` is still the old implementation — `rebuild` is 23 ahead, 57 behind | The portfolio links here. Sort it out before the 15th |
| Site rate-limit tiers cap at 100k/min — below 10k RPS | Disable for load runs, and say so in the write-up |
| Artillery is Node-based and can't generate 10k RPS | `k6` or `bombardier` for the real runs |
| Continuous aggregates refresh hourly | Drop `schedule_interval` once real traffic exists |
| npm `@akdevv/pulse` v0.1.4 may lag `sdk/src` | Diff and republish before telling anyone to install it |
| An LLM key with no spend cap | Set the cap on day one |

---

## 10. After the 15th

Not before: the sustained Tier 2 run if it didn't happen, comparison-to-previous-period in the dashboard, alerting, and a public roadmap. All of it optional. The two tests are the finish line.
