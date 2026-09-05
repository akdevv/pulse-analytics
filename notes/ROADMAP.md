# Pulse Analytics roadmap

What's left, in the order it gets done. Day-to-day checklist is `notes/todos.md` (gitignored).

---

## 1. Where it stands

Privacy-friendly web analytics: hosted dashboard plus a tiny SDK. No cookies, no third parties. The SDK posts events to an endpoint that only validates, rate-limits and enqueues. A worker enriches them and batch-writes to TimescaleDB. A Next.js dashboard reads the aggregates.

It was built to learn how a high-throughput pipeline fits together. That worked. What's left is making it a tool instead of a repo.

| Piece | State |
|---|---|
| SDK | `@akdevv/pulse` v0.1.4 on npm. Pageviews, SPA routes, custom events, React hook |
| Ingestion | Rate limit, Zod validation, BullMQ enqueue. Works |
| Worker | UA parsing, GeoIP, batched writes. Works |
| Analytics API | Overview, timeseries, pages, referrers, devices, geo, realtime SSE. Works |
| AI queries | Built 5 Sept. Cost control and tests still open |
| Dashboard | Auth, sites, analytics, setup page. Works, unpolished |
| Custom events | `data-pulse-event` clicks and `trackEvent`. Counts, property breakdown, realtime |
| Docs | Five pages at `/docs`, plus the SDK README |
| Deployment | None. Local docker only |
| Load testing | Configs written, never run |

---

## 2. Definition of done

Two tests. Both pass or the project isn't finished.

**Test 1, a real developer can adopt it.** Someone lands on the site, signs up, installs Pulse on a live site (`akdevv.com` is the guinea pig) and sees pageviews and button clicks, using only the docs. No repo spelunking, no asking me.

**Test 2, the throughput claim is verified.** A number I measured, under stated conditions, with graphs and a method someone else could repeat.

Everything below serves one of those.

---

## 3. The four phases

| # | Phase | Why here |
|---|---|---|
| 1 | Finish AI queries | Mostly built. Close it while it's still in my head |
| 2 | Test 1, real adoption | Nothing is provable until it runs somewhere public |
| 3 | Test 2, load on AWS | Needs a deployed, tuned system to point at |
| 4 | UI/UX polish and nice-to-haves | Blocks nothing. Eats unlimited time if allowed |

Phases 1 to 3 are the product working and the numbers proving it. Phase 4 is paint. Don't paint early.

---

## 4. Phase 1, finish AI queries

Built 5 Sept: the `ai` module, the Ask tab, the `ai_conversations` migration, and `0008_ai_readonly.sql` (read-only role plus two site-scoped views). Architecture lives in `notes/ai-query.md`. That's the reference, not this file.

Provider is any OpenAI-compatible `/chat/completions` endpoint, set by `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`. Without a key the feature is off and the API still boots, which deployment needs.

Left to do:

- **Commit and apply `0008_ai_readonly.sql`** everywhere, and point `AI_DATABASE_URL` at the `ai_readonly` role. On the app's own role the feature is not safe.
- **Validator tests.** It's a security boundary: write statements, DDL, CTE writes, cross-site reads, missing `LIMIT`, stacked statements. The one suite that isn't optional.
- **Per-user rate limit** on `/ask`.
- **Question cache**, `sha256(normalized question + siteId)` to SQL. Repeat questions cost nothing.
- **Global daily budget** with a clean "out of questions today" state instead of a raw provider error.
- **Ask panel error states**: validator rejection, timeout, empty result.

Skipped on purpose: SSE streaming, and a second LLM call turning rows into prose. Answers are a table plus the SQL. More honest anyway.

---

## 5. Phase 2, Test 1

Deploy it, document it, then install it on a real site by following those docs and fix what that exposes.

### 5.1 Deploy

Nothing downstream works without a public URL. Four processes: API, worker, Postgres **with TimescaleDB**, Redis. Hosts and cost in §8.

- Node 22 image (`backend/Dockerfile` is still `node:20-alpine`)
- GeoIP downloaded at build time with a MaxMind key
- Migrations run, Prisma plus `db/migrate.ts`, including `0008`
- Worker as a second service, same image, different start command
- Frontend on Vercel, `NEXT_PUBLIC_API_URL` at the live API
- Real secrets, CORS locked to the frontend domain, `RATE_LIMIT_ENABLED=true`
- Health check green from the public internet, not just from the box

### 5.2 The adoption journey

**1. Land on the site.** No docs link, no live demo today. Needs both, in the nav.

**2. Sign up, create a site.** Works. Nothing missing.

**3. Install the snippet.** The setup page gives a `<script>` tag with `data-tid` and `data-host` plus a curl smoke test. On `akdevv.com` (Astro) it goes in the base layout `<head>`. Astro is multi-page, so every navigation is a real page load and fires its own pageview. SPA route detection only matters with View Transitions on.

Missing:
- **Framework install guides.** "Paste it in `<head>`" is not enough. Astro, Next.js App Router, plain HTML, React/Vite, five lines each.
- **The npm path.** `npm i @akdevv/pulse` then `Pulse.init({ siteId, apiHost })` is better for a framework site, and the setup page never says it exists.
- **CSP note.** A strict policy needs the API host in `script-src` and `connect-src`. Today it fails silently.
- **Check the published build matches `sdk/src`.** v0.1.4 predates recent changes. Republish if it drifted.

**4. Verify it works.** Currently you paste the snippet, stare at the dashboard and hope.
- **A "waiting for your first event" state** on the setup page that polls and flips to connected. Highest-value missing piece in the flow. It's the moment the dev decides whether the tool works.
- Troubleshooting list: wrong tracking ID, ad blocker, CSP, snippet in `<body>`, domain mismatch.

**5. Track button clicks.** Done. `data-pulse-event="hire_me_click"` on a button tracks the click with no JavaScript, `data-pulse-props` carries a JSON object with it, and both installs support them — `pulse.js` now exposes `window.Pulse.trackEvent` instead of being pageview-only. On the read side, `GET /analytics/:siteId/events` returns counts and distinct visitors per name, `GET /analytics/:siteId/events/properties?name=` returns the property breakdown, the site dashboard has a Custom Events card that expands into that breakdown, and the realtime panel has a Live Events column.

Both read queries hit raw `events` rather than an aggregate: the continuous aggregates filter `eventType = 'PAGEVIEW'`, and the property breakdown groups on arbitrary JSONB keys, which a fixed-column rollup cannot express. Worth revisiting only if a real dataset makes it slow.

**6. Read reports.** Pageview and custom event coverage is solid. Nothing blocks Test 1 on the reporting side. Period comparison would be nice, not required.

### 5.3 Docs

Shipped as five markdown pages under `frontend/content/docs/v1/`, rendered at
`/docs` and readable signed out. Shiki was already installed. The SDK reference
was not in the original four; it turned out the install guides kept reaching for
signatures that had nowhere to live.

1. **Quickstart.** Create a site, install, verify the first event. Under two minutes.
2. **Install guides.** Script tag, npm, Astro, Next.js App Router, React/Vite. One block each.
3. **Tracking events.** `data-pulse-event`, `trackEvent`, the `usePulse` hook, property naming, and never putting personal data in properties.
4. **How it works.** The pipeline end to end. The page that makes an engineer trust it, and the skeleton of the case study.
5. **SDK reference.** Signatures, `/track` parameters, rate limits.

Also refresh `sdk/README.md` (it's the npm listing) and rewrite the root README around the live link. Full API reference stays as markdown in the repo. Not worth a docs site.

### 5.4 While it's fresh

- Integration tests, four flows: auth, ingestion, site isolation, analytics shapes. `supertest` is installed and unused.
- GitHub Actions: typecheck, lint, test on push.
- Sort out `main` vs `rebuild`. The portfolio links at `main`, and `main` is still the old implementation.

### Pass condition

`akdevv.com` running Pulse in production, `data-pulse-event` on a real button, and the dashboard showing pageviews, referrers and named click events from real visitors. Installed by following the docs, not from memory.

---

## 6. Phase 3, Test 2

The claim: **10,000 events per second, sustained, accepted and stored without loss.** A number with no conditions attached is marketing, so the write-up names the hardware, the duration, the percentiles and the error rate.

### What has to be true

- Sustained 30 minutes, not a 30-second spike. I'm looking for degradation over time.
- 429s and connection errors are failures. Rate limiting goes off for the run, **and the write-up says so plainly.** Site tiers cap at 100k/min, well under the 600k/min needed.
- The queue drains afterwards. A backlog that never clears means the worker is the real ceiling.
- **Rows in equal rows out.** Sent 18 million, `count(*)` returns 18 million. Strongest evidence in the exercise. It proves the pipeline, not just the endpoint.

### Tiers

**Tier 0, laptop (free, half a day).** One API process, docker Postgres and Redis, load from the same machine. Find what breaks first: event loop, Redis round-trips, batch writes, or the pool. The generator competes for CPU, so this is a floor, not a result.

**Tier 1, one cloud box (a few dollars).** Target on its own instance, load from separate instances in the same region. Artillery is Node-based and can't push serious load from one machine, so use `k6` or `bombardier`. This is the number that goes on the portfolio if Tier 2 doesn't happen.

**Tier 2, the real claim (a day, tens of dollars).** Several API instances, Redis and Timescale sized for it, three to five generators driving traffic together. One box cannot honestly produce 10k RPS.

AWS is the rig for Tiers 1 and 2. It's the one place with enough same-region capacity on demand, and it dies the same evening. It is not where the demo lives (§8).

### Record live

p50/p95/p99 at the generator, error rate by status code, accepted throughput, Redis queue depth, worker write lag, CPU and memory per box, row counts before and after.

Screenshot the graphs during the run. They can't be reconstructed later, and they are the case study.

### Write-up

Architecture and why the hot path is thin, the method in enough detail to repeat, results with graphs, what broke first and what changed, cost per million events.

### Pass condition

Either 10k RPS for 30 minutes with the queue draining and row counts matching, or a lower number I actually hit, published with the same rigour and the ceiling explained. **Both are a pass.** "3,200 RPS on a single 2-vCPU instance, and here's what broke first" beats an unverified 10k.

What isn't acceptable is today: the number on the portfolio with nothing behind it.

---

## 7. Phase 4, polish and nice-to-haves

Last, and time-boxed to two days. This phase has no natural end, so it gets a hard one.

- **Pick the visual direction first**, spacing, type scale, colour, then apply it everywhere. Piecemeal tweaks won't fix "feels cheap".
- Skeletons instead of layout jumps.
- Empty states that teach. A new site with no events should explain what to do.
- Visible errors. Failed queries currently vanish.
- Charts: axis formatting, tooltips, sensible number and date rendering.
- Mobile. The dashboard is desktop-only.
- Onboarding path: new user, site created, snippet installed, first event.
- Period comparison if there's time.

### Demo mode, also the exit plan

Nobody browsing a portfolio registers an account to look at a dashboard, so the demo link is what most visitors see. And one day I'll stop maintaining the box. The link should keep working.

A `/demo` route reading a **snapshot of real data**. After `akdevv.com` has sent traffic for a week, export that window to JSON fixtures and serve the dashboard from them. Real numbers, frozen.

Three rules, all non-negotiable:

- **Label it.** "Demo, snapshot data, September 2026", on the page. Frozen real data, stated as such, reads as honest. Live-looking fake numbers read as a lie the moment someone asks.
- **No dead ends.** Read-only. No create-site form that doesn't create. Disable, don't fake.
- **Don't fake the ask box.** It runs SQL against a real database. Either disable it with a note, or pre-record real questions with the SQL and rows they returned, labelled as recorded.

The backend stays live through September and while the project is being shown. Test 1 needs it, and the pipeline is the part worth demonstrating. After that it can be shut down and nothing on the portfolio breaks. What survives: the demo link, the npm package, the repo, the case study, the graphs.

---

## 8. Hosting and cost

Two environments, not the same machine.

- **The demo.** Always up, tiny traffic, has to feel instant. Optimised for costing nothing.
- **The load rig.** AWS, a few hours, then deleted. Optimised for being honest.

Never point a load test at the demo box. A free-tier box falls over, and sustained egress on a free account gets accounts suspended.

### What the backend needs

API, worker, Postgres **with TimescaleDB**, Redis. That extension rules out most free managed Postgres. Neon and Supabase don't offer it, and without hypertables and continuous aggregates half the project stops existing. Timescale Cloud has a trial, no free tier. So: one small box running the compose file already in the repo.

| Option | Cost | Reality |
|---|---|---|
| **Oracle Always Free** (ARM, 4 cores / 24 GB) | $0 | Best fit, runs the whole compose file easily. Signup is fussy, ARM capacity can be unavailable, and it's a VM you manage. Check the TimescaleDB tag has an arm64 build |
| **GCP free tier** (e2-micro, 1 GB) | $0 | Tight for Postgres, Redis and two Node processes. Doable with swap, not comfortable |
| **Fly.io** | ~$5–7/mo | Auto-stops when idle so the bill tracks usage. Cold start on the first hit is bad for a demo link |
| **Hetzner CX22** | ~$5/mo | Boring and reliable. My pick if Oracle's capacity won't cooperate |
| **Render / Railway** | $0–5 | Render free services sleep ~50 s and workers aren't free. Railway's allowance is a credit. Poor fits |

**Plan:** Oracle Always Free, Hetzner as fallback. Frontend on Vercel. Demo subdomain off `akdevv.com`, TLS via Caddy. Target **$0/month**.

### AI provider, free tier

No paid key. Generating SQL against a fixed schema is narrow work. Given the exact columns and two examples, a small free model does it about as well as an expensive one. The engineering worth showing is the sandbox around the SQL: read-only role, site-scoped views, validator, statement timeout. None of that changes with the model.

| Provider | Free allowance | Notes |
|---|---|---|
| **Google AI Studio** | Generous daily cap on Flash | Best quality per zero dollars. Free-tier prompts may train the model. Fine for demo analytics |
| **Groq** | Daily request and token caps | Open models, very fast. Good when response speed is visible |
| **Cerebras** | Daily caps | Same shape as Groq, also fast |
| **OpenRouter** | `:free` variants, rate limited | One endpoint, many models. Easiest place to A/B |
| **Cloudflare Workers AI** | Daily neuron allowance | Worth a look if anything lands on Cloudflare |
| **Ollama, local** | Free | A 7B coder model handles this, but tens of seconds on a CPU-only box. Laptop only |

Built against the OpenAI-compatible shape, so switching provider is three env vars, not a rewrite. One `fetch`, no abstraction layer. Structured output: ask for JSON, parse, validate with Zod, retry once. Provider JSON-schema modes are a bonus, not a dependency.

Every allowance in that table moves. Check before building.

### Load test burn

On-demand, one region, torn down the same day. Prices move, check first.

| Item | Shape | Approx |
|---|---|---|
| API instances | 3 × 2-vCPU ARM | ~$0.25/hr |
| Data layer | 1 × 4-vCPU, Postgres + Redis | ~$0.20/hr |
| Generators | 4 × 4-vCPU, **spot** | ~$0.20/hr |
| Storage, transfer | Same-AZ, small EBS | pennies |

About **$0.65/hr for the rig**, so the 30-minute run costs under a dollar. The money goes on the fumbling around it. Expect a full day of setup, mistakes and reruns.

**Budget $30–50 for the whole exercise.** Guardrails: billing alert before launching anything, spot generators, no load balancer (point generators at instance IPs, ALB charges scale with traffic and will surprise you at 10k RPS), and tear it down the same evening. The expensive mistake is leaving it running overnight.

| | |
|---|---|
| Demo, monthly | **$0**, free host, free model |
| Load testing, one-off | **$30–50** budgeted, likely less |
| Domain | Already owned |

---

## 9. Skipping

Written down so it stops coming back.

- AWS as a permanent home. It's the load rig for a day. No Terraform, no ECS, no microservices. It's an API and a worker.
- Full test coverage. Four integration flows plus the AI validator suite.
- Mobile app, email verification, billing, multi-region, the Go rewrite.
- A dedicated docs site. Four pages in the app is enough.
- Self-hosting as a pitch. It runs in docker and always will, but the product is the hosted dashboard.
- SSE streaming and prose answers in the AI feature.
- Any feature not already in the repo. (Custom-event reporting and `data-pulse-event` click tracking were the two exceptions, and both shipped.)

---

## 10. Schedule

**10 Sept workable. 15 Sept presentable.**

| Date | Phase | Work |
|---|---|---|
| **Sept 5** | 1 | Finish AI: apply `0008`, validator tests, rate limit, cache, daily budget, Ask panel errors |
| **Sept 6** | 2 | Deploy day. Node 22 image, GeoIP at build time, Timescale, Redis, API, worker, migrations, Vercel, secrets, CORS, health check green from outside |
| **Sept 7** | 2 | ~~Custom events: endpoint, dashboard card, realtime widget, `data-pulse-event`~~ done 5 Sept. Left: republish the SDK to npm |
| **Sept 8** | 2 | Four docs pages. Setup page "waiting for first event" state |
| **Sept 9** | 2 | Install on `akdevv.com` **by following the docs**, fix what that exposes. Integration tests, CI, `main` vs `rebuild` |
| **Sept 10** | | **Checkpoint. Test 1 passes**, or it gets cut down until it does. Nothing unfinished travels past this line |
| **Sept 11** | 3 | Tier 0 on the laptop, tune batch size, worker concurrency, pool. Stand up the AWS rig, run Tier 1 |
| **Sept 12** | 3 | Tier 2 if it happens. Capture every graph live. Tear the rig down that evening |
| **Sept 13** | 3 | Case study: architecture, method, results, what broke first, cost per million events |
| **Sept 14** | 4 | Visual direction everywhere, skeletons, empty and error states, charts, mobile, onboarding. Demo mode from a week of real fixtures |
| **Sept 15** | 4 | README, portfolio entry (`github`, `image`, `demo`, `wip` off), description rewritten to the measured number. Click every link as a stranger would |

If polish is unfinished on the 15th, it ships unfinished.

---

## 11. Known traps

| Trap | Fix |
|---|---|
| `0008_ai_readonly.sql` uncommitted, so `AI_DATABASE_URL` falls back to the app role | Commit, run everywhere, verify `ai_readonly` cannot write |
| `GeoLite2-City.mmdb` is 66 MB and gitignored, so the image has no GeoIP | MaxMind key, download at build. If it fights back, ship geo off and hide the card |
| `backend/Dockerfile` is on `node:20-alpine`, README says 22+ and Prisma 7 wants it | Bump before deploying |
| The worker is a separate process, not a thread of the API | Second service, same image, different start command |
| Free-tier Redis (10k commands/day) won't survive demo traffic | Redis container next to the API |
| `origin/main` is still the old implementation, `rebuild` is 23 ahead, 57 behind | The portfolio links here. Fix before the 15th |
| Site rate-limit tiers cap at 100k/min, below 10k RPS | Disable for load runs, say so in the write-up |
| Artillery can't generate 10k RPS | `k6` or `bombardier` for real runs |
| Continuous aggregates refresh hourly | Drop `schedule_interval` once real traffic exists. At 10k RPS real-time aggregation live-computes ~36M rows per query |
| npm v0.1.4 may lag `sdk/src` | Diff and republish before telling anyone to install it |
| Free AI keys still have daily caps, and the ask box is public | Global budget plus per-user limit before it goes public |

---

## 12. After the 15th

Tier 2 if it didn't happen, period comparison, alerting, a public roadmap. All optional. The two tests are the finish line.
