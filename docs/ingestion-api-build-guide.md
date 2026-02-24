# Pulse Analytics — Ingestion API Build Guide

A step-by-step guide to building the full analytics ingestion pipeline, one small piece at a time. Every step has a visible outcome so you can see the impact before moving on.

---

## How to use this guide

- **Never skip steps.** Each step builds directly on the previous one.
- **Verify before moving on.** Every step has a "how to verify" note.
- **Small steps only.** If a step feels too big, break it down further.
- **Understand before adding complexity.** Add Redis only after you see why the DB lookup is slow. Add a queue only after you feel the pain of synchronous writes.

---

## Phase 1 — Basic Track Route (Get Something Working)

> Goal: Have a `/track` endpoint that accepts a request and responds. Nothing fancy.

### 1.1 — Create the bare route
- Create `track.routes.ts` with a single `POST /` handler
- Just `console.log("hit")` and return `res.status(204).send()`
- Mount it in `app.ts` at `/api/track`
- **Verify:** `curl -X POST http://localhost:3000/api/track` → see `204` and `"hit"` in terminal

### 1.2 — Log the raw query params
- Inside the handler, `console.log(req.query)`
- Send a request with some params: `?tid=pk-abc&t=PAGEVIEW&dl=https://example.com`
- **Verify:** You can see all the raw params printed in the terminal
- **Why this matters:** You now know exactly what data arrives and in what shape

### 1.3 — Move handler logic to a controller
- Create `track.controller.ts` with a `track` function
- Move the `console.log` into the controller
- Import and use it in the routes file
- **Verify:** Same curl request, same output, code is now split into route + controller

### 1.4 — Add Zod validation
- Create `track.types.ts` with the `TrackQuerySchema`
- In the controller, call `TrackQuerySchema.safeParse(req.query)`
- If it fails, log a warning and return `204`
- If it passes, log `"valid request"` and return `204`
- **Verify:** Send a valid request → see `"valid request"`. Send one with missing `dl` → see the warn log

### 1.5 — Extract IP and User-Agent
- Create `track.service.ts` with `extractClientIp(req)` function
- Read `req.headers["user-agent"]` directly in the controller
- `console.log` both values alongside the validated params
- **Verify:** See your own IP and browser UA string in the logs when you send a request

---

## Phase 2 — Connect to the Database (Persist Events)

> Goal: Save a real row to the database. See it appear with a DB query.

### 2.1 — Check the Prisma schema
- Open `schema.prisma` and read the `Event` model fields
- Make a list of which fields are required (no `?`) vs optional
- **Verify:** You can name all required fields from memory — `browser`, `browserVersion`, `os`, `osVersion`, `url`, `urlHostname`, `urlPathname`, `eventType`, `siteId`, `eventId`

### 2.2 — Run the migration
- Run `prisma migrate dev --name add_events_table`
- Open your DB client and confirm the `events` table exists
- **Verify:** Table is visible, columns match the schema

### 2.3 — Parse the URL in the service
- Add `parseUrl(rawUrl: string)` to `track.service.ts`
- Use `new URL(rawUrl)` to extract `hostname`, `pathname`, `search`
- `console.log` the result with a test URL
- **Verify:** `"https://example.com/blog?ref=twitter"` → `{ hostname: "example.com", pathname: "/blog", search: "?ref=twitter" }`

### 2.4 — Parse the User-Agent in the service
- Install `ua-parser-js` and `@types/ua-parser-js`
- Add `parseUserAgent(ua: string)` to `track.service.ts`
- Log what it returns for your own browser's UA string
- **Verify:** You see `{ browser: "Chrome", browserVersion: "...", os: "macOS", ... }` in logs

### 2.5 — Build the full `ParsedEvent` object
- Add `buildParsedEvent(params, req, siteId)` to `track.service.ts`
- It calls `extractClientIp`, `parseUrl`, `parseUserAgent`, generates a `uuidv4()` for `eventId`
- Returns a complete `ParsedEvent` object
- In the controller, call it and `console.log` the result
- **Verify:** You see a fully populated event object in the terminal with all fields filled

### 2.6 — Look up the site by tracking ID
- In the controller, add `prisma.site.findFirst({ where: { trackingId: params.tid, isActive: true } })`
- If no site found, log a warning and return `204`
- For now just log `"site found: " + site.id` if it succeeds
- **Verify:** Use a real `tid` from your DB → see the site ID logged. Use a fake `tid` → see the warn log

### 2.7 — Create the `insertEvent` repository function
- Create `track.repository.ts`
- Add `insertEvent(event: ParsedEvent)` using `prisma.event.create({ data: {...} })`
- Map every field from `ParsedEvent` to the Prisma model
- **Verify:** Call it once manually in a test script, then check the DB — the row should be there

### 2.8 — Wire it all together in the controller
- Controller flow: validate → site lookup → build event → insert event → return `204`
- `console.log("event saved")` after the insert
- **Verify:** Send a valid curl request → see `"event saved"` → query DB → see the row

---

## Phase 3 — Harden the Ingestion (Make it Reliable)

> Goal: Handle bad input, edge cases, and errors gracefully without ever breaking the client page.

### 3.1 — Add step timing
- Use `performance.now()` at the start of each step
- Capture: `validation`, `siteLookup`, `buildEvent`, `dbWrite`, `total`
- Log them all when `debug=true` is in the query params
- **Verify:** Add `&debug=true` to your curl request → see timing breakdown in logs

### 3.2 — Wrap everything in try/catch
- Add a `try/catch` around the main flow in the controller
- In the catch block, log the error and still return `204`
- **Verify:** Temporarily throw an error inside the handler → confirm you still get `204` back, not a 500

### 3.3 — Tighten the `tid` validation
- Update the `tid` field in `TrackQuerySchema` with a regex: `^pk-[a-zA-Z0-9]{29}$`
- **Verify:** Send `tid=garbage` → validation fails and logs warn. Send a proper `pk-` ID → passes

### 3.4 — Add a request size limit
- In `track.routes.ts`, add `express.json({ limit: "8kb" })` middleware before the route handler
- **Verify:** This prevents someone sending a massive query string to abuse the endpoint

### 3.5 — Always return 204 — even on errors
- Go through every code path in the controller
- Make sure every single `return` sends `res.status(204).send()`
- **Verify:** Bad `tid`, missing fields, DB down, unknown error — all return `204`, never a 500

---

## Phase 4 — Build the JavaScript SDK

> Goal: A script that a website owner embeds on their page. It auto-collects all event data and sends it to `/track`.

### 4.1 — Create the SDK file
- Create `sdk/pulse.js`
- Add a self-executing function wrapper so it doesn't pollute global scope: `(function() { ... })()`
- `console.log("Pulse SDK loaded")` inside
- **Verify:** Add a `<script>` tag pointing to this file in an HTML page → see the log in browser console

### 4.2 — Auto-collect page data
- Read `window.location.href` → this is `dl`
- Read `document.referrer` → this is `dr`
- Read `document.title` → this is `dt`
- Read `navigator.language` → this is `ul`
- Read `screen.width + "x" + screen.height` → this is `sr`
- Read `window.innerWidth + "x" + window.innerHeight` → this is `vp`
- `console.log` all of them on load
- **Verify:** Open the HTML page in a browser → see all values logged in the console

### 4.3 — Generate and persist a visitor ID
- On first load, generate a UUID for the visitor
- Save it to `localStorage` with key `pulse_cid`
- On every subsequent load, read it from `localStorage` instead of generating a new one
- **Verify:** Open the page → check `localStorage` in DevTools → see `pulse_cid`. Refresh → same value. Open new tab → same value.

### 4.4 — Generate and persist a session ID
- On first load of a tab, generate a UUID for the session
- Save it to `sessionStorage` with key `pulse_sid`
- Read it on every subsequent event in the same tab
- **Verify:** Open page → see `pulse_sid` in sessionStorage. Refresh → same ID. Close tab, reopen → new ID.

### 4.5 — Send the track request
- Build the query string from all collected values
- Add the `tid` (hardcoded for now, configurable later via `data-tid` attribute on the script tag)
- Add a random `z` param as a cache buster: `z=Math.random()`
- Send `fetch("/api/track?" + queryString, { method: "POST" })` — fire and forget, no `await`
- **Verify:** Open the page → check the Network tab in DevTools → see the POST request go out → see `204` back → check DB for the row

### 4.6 — Make the SDK configurable
- Read the `tid` from the script tag's `data-tid` attribute: `document.currentScript.dataset.tid`
- Read the API host from `data-host` so it can point to your backend URL
- **Verify:** Change the `data-tid` value in the HTML → see the new `tid` sent in the request

### 4.7 — Handle Single Page Apps
- Listen for browser navigation: `window.addEventListener("popstate", sendPageview)`
- Monkey-patch `history.pushState` to also fire an event when the URL changes programmatically
- On each navigation, re-collect `dl` and `dt` and send a new `PAGEVIEW` event
- **Verify:** In a SPA or by manually calling `history.pushState(null, "", "/new-page")` in the console → see a new event in DB with the updated URL

---

## Phase 5 — Add Redis Caching (Speed Up the Site Lookup)

> Goal: Stop hitting the DB on every single request just to look up a site. Cache it.

### 5.1 — Understand the problem first
- Add a log line that prints the `siteLookup` timing from Phase 3
- Send 20 requests rapidly and watch the logs
- **Observe:** Every single request hits the DB, taking 4–8ms just to look up data that never changes

### 5.2 — Set up Redis
- Install `ioredis`
- Create `src/config/redis.ts` with a singleton `Redis` client
- Add `REDIS_URL` to `.env`
- On server startup, log `"Redis connected"` when the connection succeeds
- **Verify:** Start the server → see `"Redis connected"` in logs

### 5.3 — Test basic Redis get/set
- In a test script, do `redis.set("hello", "world")` then `redis.get("hello")`
- **Verify:** Get returns `"world"`. This confirms Redis is working before you touch the hot path.

### 5.4 — Cache the site lookup
- Create `track.cache.ts`
- Add `getCachedSite(trackingId)` function
- Check Redis first: `redis.get("site:tid:" + trackingId)`
- On cache miss: query DB, then `redis.setex(key, 300, JSON.stringify(site))` (300s = 5 min TTL)
- On cache hit: parse the JSON and return it directly
- Log `"cache HIT"` or `"cache MISS"` so you can see it working
- **Verify:** First request → `"cache MISS"` + DB query. Second request → `"cache HIT"`, no DB query. `siteLookup` timing drops from ~5ms to ~0.3ms.

### 5.5 — Invalidate the cache when a site changes
- In your sites service, when a site is deactivated or its `tid` is regenerated, call `redis.del("site:tid:" + oldTrackingId)`
- **Verify:** Deactivate a site via the API → send a track request → it no longer finds the site (cache was cleared)

---

## Phase 6 — Add Rate Limiting (Protect the Endpoint)

> Goal: Stop a single site or IP from flooding the endpoint.

### 6.1 — Understand the approach
- We use Redis to count requests per site per minute
- Key: `ratelimit:{siteId}:{currentMinute}` — the minute bucket resets naturally via TTL
- No complex algorithm needed for v1 — a simple counter is enough

### 6.2 — Implement per-site rate limiting
- Create `track.ratelimit.ts`
- Add `checkSiteRateLimit(siteId, tier)` function
- Use `redis.incr(key)` to increment the counter
- On the first increment (`count === 1`), set a 120s TTL on the key
- Compare count against tier limits: `FREE=1000`, `PRO=10000`, `ENTERPRISE=100000`
- Return `true` (allowed) or `false` (blocked)
- **Verify:** Write a quick script that sends 1001 requests. Check the logs — the 1001st should be rate limited.

### 6.3 — Implement per-IP rate limiting
- Same pattern but key is `ratelimit:ip:{ipAddress}:{currentMinute}`
- Limit: 500 requests per minute per IP regardless of tier
- **Verify:** Rapid-fire requests from your machine → after 500 in a minute, they start being dropped

### 6.4 — Wire both checks into the controller
- After the site lookup, call both rate limit checks
- If either fails, log a warn and return `204`
- Add `rateLimit` to your timing object so you can see the overhead
- **Verify:** Normal traffic passes through. Excessive traffic is silently dropped.

---

## Phase 7 — Go Async with a Queue (Decouple Ingestion from Storage)

> Goal: Return `204` in under 2ms. Move the DB write to a background worker.

### 7.1 — Understand the problem first
- Look at your `total` timing from the debug logs
- The `dbWrite` step is the biggest cost (~5–15ms) and it blocks the response
- **The insight:** The client doesn't need to wait for the DB write. They just need to know we received the event.

### 7.2 — Build an in-memory queue first (no dependencies)
- Create `track.queue.ts`
- Make a simple array: `const queue: ParsedEvent[] = []`
- Add `enqueue(event)` that pushes to the array
- Add a `setInterval` that runs every second, drains the array, and logs `"processing X events"`
- **Verify:** Send 5 requests → see `"processing 5 events"` logged 1 second later. Response is now instant.

### 7.3 — Move the DB write into the interval processor
- In the interval callback, call `insertEvent(event)` for each item
- Log success and failure per event
- **Verify:** Send requests → `204` comes back instantly → 1 second later → rows appear in DB

### 7.4 — See the timing improvement
- Add `debug=true` to a request and check the `total` timing
- **Observe:** `dbWrite` is now gone from the response path. Total drops from ~15ms to ~2ms.

### 7.5 — Understand the problem with in-memory queues
- Kill the server while events are in the queue
- Restart the server
- **Observe:** Those events are gone. In-memory queues don't survive restarts. This is why we need a real queue.

### 7.6 — Install and understand BullMQ
- Install `bullmq`
- Read the BullMQ docs for 15 minutes — understand: Queue, Worker, Job, concurrency
- Create a tiny standalone script that adds a job and processes it with a worker
- **Verify:** Run the script, see the job get picked up and logged. This is just learning — no integration yet.

### 7.7 — Create the events queue
- Create `src/config/queue.ts` with a `Queue` instance named `"events"` connected to Redis
- Export an `enqueue(event: ParsedEvent)` function that calls `queue.add("track", event)`
- **Verify:** Call `enqueue` from a test script → open Redis CLI → run `KEYS bull:events:*` → see the job sitting there

### 7.8 — Replace in-memory queue with BullMQ in controller
- Remove the `setInterval` queue
- Replace `insertEvent(event)` with `enqueue(event)` in the controller
- **Verify:** Send a request → `204` instantly → check Redis → see the job → it hasn't been processed yet (no worker running)

### 7.9 — Build the worker
- Create `src/workers/event.worker.ts`
- Create a BullMQ `Worker` that listens to the `"events"` queue
- In the processor, call `insertEvent(job.data)` and log success
- Create `worker.ts` entry point that starts the worker process
- Add `"worker": "ts-node src/worker.ts"` to `package.json` scripts
- **Verify:** Run `npm run worker` in a separate terminal → send a request via curl → see the worker pick up the job and log success → check DB for the row

### 7.10 — Test resilience
- Start the server and worker
- Send 10 requests
- Kill the worker immediately after (Ctrl+C)
- Wait 30 seconds
- Restart the worker
- **Verify:** The 10 jobs were persisted in Redis. The worker picks them all up after restart. Zero data loss.

### 7.11 — Add retry logic
- Configure the worker with `attempts: 3` and `backoff: { type: "exponential", delay: 1000 }`
- Temporarily make `insertEvent` throw an error
- **Verify:** Watch the job retry 3 times with increasing delays in the worker logs

### 7.12 — Add a Dead Letter Queue
- Create a second queue named `"events-failed"`
- In the worker's `failed` event handler, add the failed job to the DLQ with the error details
- **Verify:** After 3 failed retries, see the job appear in `"events-failed"` queue in Redis

---

## Phase 8 — Batch Processing (Reduce DB Load)

> Goal: Instead of one DB write per event, write 100 events in a single query.

### 8.1 — Understand why batching matters
- Open your DB monitoring or logs
- Notice that at 100 RPS, you're making 100 individual `INSERT` statements per second
- **The insight:** One `INSERT ... VALUES (...), (...), (...)` with 100 rows is ~10x faster than 100 single inserts

### 8.2 — Collect events in the worker before writing
- Instead of processing one job at a time, collect jobs into a batch
- Wait until either 100 events are collected OR 1 second has passed — whichever comes first
- Then write them all at once

### 8.3 — Switch to `createMany` in the repository
- Add `insertManyEvents(events: ParsedEvent[])` to `track.repository.ts`
- Use `prisma.event.createMany({ data: events.map(e => ({...})) })`
- **Verify:** Send 100 requests → watch the worker logs → see `"inserted 100 events in Xms"` as a single operation

### 8.4 — Compare the timing
- Log the time taken per event for single inserts vs batch inserts
- **Observe:** Single inserts at 100 events ≈ ~1000ms total. Batch insert of 100 ≈ ~20ms total. That's a 50x improvement.

---

## Phase 9 — Enrich Events in the Worker

> Goal: Move slow enrichment work out of the hot path and into the worker.

### 9.1 — Move UA parsing to the worker
- Right now `parseUserAgent` runs in the controller (hot path)
- Change the controller to store the raw `userAgent` string in the queued event
- Move `parseUserAgent` call into the worker, before `insertEvent`
- **Verify:** Hot path timing drops slightly. Worker logs show UA parsing happening there instead.

### 9.2 — Add GeoIP lookup
- Download the free MaxMind GeoLite2 City database (requires free account)
- Install `@maxmind/geoip2-node`
- In the worker, add `lookupGeoIp(ipAddress)` that returns `{ country, city, region }`
- Add `country` and `city` columns to the `Event` model in Prisma, run migration
- **Verify:** After processing, rows in DB have country/city filled in from the IP address

### 9.3 — Cache GeoIP lookups
- The same IP address can appear thousands of times (regular visitors)
- Add a simple `Map<string, GeoData>` in-memory cache in the worker
- Check the cache before calling the MaxMind library
- **Verify:** Send 10 requests from your machine → see `"geo cache HIT"` for 9 of them in worker logs

---

## Phase 10 — Observability (Know What's Happening)

> Goal: Be able to answer "is the system healthy?" at any moment.

### 10.1 — Expand the health check endpoint
- Your `/health` route currently just returns `"OK"`
- Add checks: can you reach Redis? Can you reach the DB?
- Add queue depth: how many jobs are waiting to be processed?
- Return `{ status: "ok", redis: "ok", db: "ok", queueDepth: 42 }`
- **Verify:** Hit `/health` → see live status. Shut down Redis → see `redis: "error"`.

### 10.2 — Add slow request alerting
- In the controller, after calculating `timings.total`, check if it exceeds 100ms
- If it does, log a warning with the full timing breakdown
- **Verify:** Artificially slow down a step → see the slow request warning appear in logs

### 10.3 — Add queue depth monitoring
- In the worker, after processing a batch, log the current queue depth
- If depth exceeds 10,000, log a warning
- **Verify:** Pause the worker and send 100 requests → queue builds up → restart worker → see the depth warning then drain

### 10.4 — Add worker throughput logging
- Every 60 seconds, log how many events the worker processed in that minute
- **Verify:** Let it run for a few minutes under load → see events/minute logged consistently

---

## Phase 11 — Move to AWS SQS (Production Queue)

> Goal: Replace BullMQ (Redis-backed) with AWS SQS (managed, infinitely scalable).

### 11.1 — Set up LocalStack for local AWS simulation
- Install LocalStack via Docker
- Add it to `docker-compose.yml`
- Install `@aws-sdk/client-sqs`
- **Verify:** LocalStack starts, you can run `aws --endpoint-url=http://localhost:4566 sqs list-queues` and get a response

### 11.2 — Create an SQS queue locally
- Using the AWS SDK, create a standard SQS queue named `pulse-events`
- Create a Dead Letter Queue named `pulse-events-dlq`
- Configure the main queue to move messages to DLQ after 3 failures
- **Verify:** Both queues visible in LocalStack

### 11.3 — Create the SQS producer
- Create `src/config/sqs.ts` with an `SQSClient`
- Add `publishToSqs(event: ParsedEvent)` that calls `SendMessageCommand`
- **Verify:** Call it from a test script → run `aws sqs get-queue-attributes` → see `ApproximateNumberOfMessages: 1`

### 11.4 — Replace BullMQ enqueue with SQS publish
- In the controller, swap `enqueue(event)` for `publishToSqs(event)`
- **Verify:** Send a request → check SQS → see the message sitting in the queue

### 11.5 — Build the SQS worker (poller)
- Replace the BullMQ worker with an SQS long-polling loop
- Poll for up to 10 messages at a time (`MaxNumberOfMessages: 10`)
- Process each message, then delete it from the queue (`DeleteMessageCommand`)
- If processing fails, don't delete it — SQS will redeliver it automatically
- **Verify:** Send 5 requests → start the worker → see all 5 processed and deleted from queue

### 11.6 — Test with real AWS (staging)
- Create a real SQS queue in AWS
- Point `AWS_SQS_URL` in `.env` to the real queue
- Run the server and worker against real AWS
- **Verify:** End-to-end works exactly the same as LocalStack, just with real infrastructure

---

## Phase 12 — Containerize (Docker)

> Goal: Run everything in containers so the dev environment matches production exactly.

### 12.1 — Write the API Dockerfile
- Start from `node:20-alpine`
- Copy `package.json`, install deps, copy source, build TypeScript, expose port, set `CMD`
- **Verify:** `docker build -t pulse-api .` succeeds. `docker run -p 3000:3000 pulse-api` starts the server.

### 12.2 — Write the worker Dockerfile
- Same base image, different `CMD` that runs the worker entrypoint
- **Verify:** `docker build -t pulse-worker .` succeeds

### 12.3 — Write `docker-compose.yml`
- Services: `api`, `worker`, `postgres`, `redis`, `localstack`
- Set environment variables for each service
- Add a health check to postgres so the API waits for it before starting
- **Verify:** `docker compose up` → all services start → curl the track endpoint → row appears in DB

### 12.4 — Test the full local stack
- `docker compose up` from a clean environment (no local Node, no local Redis)
- Send a request
- **Verify:** Everything works identically to running it natively. This is your proof that the containerization is correct.

---

## Phase 13 — Deploy to AWS (Production)

> Goal: Run the system on real infrastructure that can auto-scale.

### 13.1 — Set up Terraform
- Install Terraform
- Create `infrastructure/terraform/` folder
- Write `main.tf` with just a provider block and a test resource (e.g., an S3 bucket)
- Run `terraform init` and `terraform plan`
- **Verify:** `terraform plan` shows the S3 bucket will be created. This proves Terraform is configured correctly.

### 13.2 — Provision the database (RDS)
- Write a Terraform module for an RDS PostgreSQL instance
- Use `t3.micro` for dev/staging (cheap)
- **Verify:** `terraform apply` → RDS instance appears in AWS console → you can connect to it and run `prisma migrate deploy`

### 13.3 — Provision Redis (ElastiCache)
- Write a Terraform module for a single-node ElastiCache Redis cluster
- **Verify:** `terraform apply` → cluster appears → update `REDIS_URL` in env → Redis caching works against real ElastiCache

### 13.4 — Provision SQS queues
- Write Terraform for the main queue and DLQ
- Configure the DLQ redrive policy
- **Verify:** Both queues appear in AWS console → send a test message → worker picks it up

### 13.5 — Push Docker images to ECR
- Create ECR repositories for `pulse-api` and `pulse-worker` in Terraform
- Build and push the images: `docker build`, `docker tag`, `docker push`
- **Verify:** Images appear in ECR with the correct tags

### 13.6 — Deploy API to ECS Fargate
- Write an ECS task definition for the API container
- Create an ECS service with desired count 1
- Put an Application Load Balancer in front of it
- **Verify:** ECS task is running → hit the ALB URL → get a `204` from `/api/track`

### 13.7 — Deploy worker to ECS Fargate
- Write an ECS task definition for the worker container
- Create an ECS service for the worker (no load balancer needed)
- **Verify:** Worker task is running → send a track request → see it processed in CloudWatch logs

### 13.8 — Set up auto-scaling for the API
- Add a CloudWatch alarm: scale out when CPU > 60%
- Add a CloudWatch alarm: scale in when CPU < 20%
- **Verify:** Run a load test → watch ECS scale from 1 to multiple tasks automatically

### 13.9 — Set up auto-scaling for the worker
- Add a CloudWatch alarm: scale out when SQS queue depth > 5,000
- Scale in when queue depth < 500
- **Verify:** Flood the queue with messages → worker scales out → queue drains → worker scales back in

---

## Phase 14 — Load Testing (Prove It Works at Scale)

> Goal: Confirm the system handles 10,000 RPS before calling it done.

### 14.1 — Install k6
- Install k6 locally
- Write a minimal test script: send 1 request per second for 10 seconds
- **Verify:** k6 runs, shows 10 requests sent, all `204`

### 14.2 — Load test locally (baseline)
- Ramp up to 100 RPS, hold for 60 seconds
- Watch the timing logs — see where time is spent
- **Verify:** p95 latency is under 10ms at 100 RPS locally

### 14.3 — Load test on staging (real infrastructure)
- Point k6 at your staging ALB URL
- Ramp up to 1,000 RPS
- Watch CloudWatch metrics, ECS task count, SQS depth
- **Verify:** System stays stable, no errors, auto-scaling kicks in as needed

### 14.4 — Load test to 10,000 RPS
- Ramp: 0 → 1k → 5k → 10k over 10 minutes, hold at 10k for 10 minutes
- Watch: response latency, error rate, queue depth, worker throughput, DB write rate
- **Verify:** p99 latency under 5ms for ingestion. Zero dropped requests. Queue drains within 30 seconds of load stopping.

### 14.5 — Test failure scenarios
- Kill one Redis node → confirm graceful degradation (events still accepted, just slower)
- Kill one worker → confirm queue depth rises but no data is lost, worker restarts
- Throttle the DB → confirm events queue up and process when DB recovers
- **Verify:** System degrades gracefully under failure, recovers automatically when components come back

---

## Where You Are Right Now

You have completed the skeleton of Phase 1 (steps 1.1 – 1.5) and the beginning of Phase 2.

**Your immediate next step is Phase 2.1** — verify the Prisma schema is in sync, run the migration, and confirm the `events` table exists in the DB.

Everything else follows in order from there.
