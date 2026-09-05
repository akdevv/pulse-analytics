This is the long version: what happens to an event between a click on your site and a number on a dashboard, and why each piece is built the way it is.

You do not need any of it to use Pulse. Read it if you are deciding whether to trust the thing, or if you want to know what happens to your data when something breaks.

## The whole path

```
 browser              ingestion API           Redis             worker             TimescaleDB
┌──────────┐         ┌────────────┐         ┌────────┐        ┌─────────┐        ┌────────────┐
│ pulse.js │ POST    │ validate   │ enqueue │ BullMQ │ job    │ enrich  │ batch  │ events     │
│ or SDK   │ ──────▶ │ rate limit │ ─────▶  │ queue  │ ─────▶ │ + batch │ ─────▶ │ hypertable │
└──────────┘         └────────────┘         └────────┘        └─────────┘        └────────────┘
     ▲                     │
     └───── 204 ───────────┘
```

Five hops, and the interesting design decisions all live in the first two. The rest is careful plumbing.

## The browser sends and forgets

The SDK builds a query string, posts it, and moves on:

```ts
fetch(endpoint, { method: "POST", keepalive: true }).catch(() => {
  // silently swallow, analytics must never throw on the host page
});
```

Four choices are packed into those three lines.

**Everything rides in the query string.** The body is empty and the server ignores it. That makes an event a single URL you can paste into a terminal, which is why the [reference](/docs/reference#tracking-endpoint) can document the wire format at all, and why a curl smoke test is a real test rather than an approximation.

**`POST` rather than `GET`,** even though the payload is in the URL. A `GET` is fair game for prefetchers, proxies, and browser caches, all of which are happy to replay one. A `POST` is not cached, and the `z` cache buster covers the rest.

**`keepalive: true`.** The most valuable pageview is often the last one before the visitor leaves, and a normal `fetch` dies with the document. `keepalive` hands the request to the browser to finish on its own, which is what makes tracking a click that navigates away work at all.

**The `catch` is empty on purpose.** Analytics code runs inside someone else's application. A network failure, a blocked request, a CORS mistake, none of it is the host page's problem, so none of it reaches the console or the error boundary. The worst case for a broken Pulse install is missing data, never a broken site.

The SDK never awaits the result, never retries, and never queues locally. An event that fails to leave the browser is gone. That is a real cost and the [ledger below](#what-fire-and-forget-actually-costs) spells it out.

## The hot path

The endpoint has one job: decide fast, then get out of the way. Nothing here touches Postgres and nothing here waits on a disk.

```
 POST /api/v1/track
     │
     ├─ 1  parse and validate the query string      Zod, in process
     ├─ 2  resolve the tracking ID to a site        Redis, 5 minute TTL
     ├─ 3  check two rate limit counters            Redis, one per minute
     ├─ 4  build the event row                      in process
     ├─ 5  push the job onto the queue              Redis
     │
     └─ 204 No Content
```

**Validation** rejects anything that is not a plausible event. The tracking ID has to match `pk-` plus 32 characters, `dl` has to parse as a URL, screen and viewport have to look like `1280x800`. Bad input is dropped here rather than being stored and cleaned up later.

**The site lookup** is the one step that could reach the database, so it is cached in Redis under `site:tid:<id>` for five minutes. Two extra details matter under load. Cache misses for the same tracking ID are deduplicated in process, so a thousand simultaneous requests for a cold ID produce one Postgres query rather than a thousand. If Redis errors on this key, the lookup falls back to Postgres rather than failing, because a slow event beats no event. That fallback covers a bad key or a blip, not a full outage: with rate limiting enabled, a Redis that is properly down rejects the request one step later anyway.

**Rate limiting** is two counters, both incremented per minute: one for the site, one for the client IP. Either can reject. The IP counter is what stops a single loop from spending a site's whole budget.

This step fails closed. If Redis errors, the request is rejected rather than waved through, on the reasoning that the moment your limiter is broken is exactly the moment you need it.

**Building the row** splits the URL into hostname, path, and query string, stamps a UUID and a received time, and packages the request headers. Cheap string work, no I/O.

**Enqueueing** hands the event to BullMQ. The handler does not wait for Redis to acknowledge the write before it responds, which is the last piece of the fire and forget design: the visitor's browser is released the moment the event is accepted in principle, not once it is durably queued.

Then `204`, and the request is over. The whole path is a few Redis round trips, and requests slower than 100 ms get logged with a per step breakdown so you can see which one it was.

## Why every response is 204

`/track` answers `204 No Content` to everything. A good event, an unknown tracking ID, a malformed URL, a rate limited flood, an internal exception. All of them, empty body, no error, no detail.

This is the decision people push back on most, so here is the whole argument.

**A tracking ID is public, and error codes turn it into an oracle.** Return `404` for an unknown ID and `204` for a real one, and anyone can now enumerate valid tracking IDs, or check whether a given site still exists, by watching status codes. Every response being identical means the endpoint tells an attacker nothing it does not tell everyone.

**Errors would land in someone else's console.** The script runs on your site, not ours. A `429` during a traffic spike prints a red line in the console of every visitor, on a page whose owner did nothing wrong, about a system they cannot fix from there. Analytics gets to be silent about its own problems.

**Nothing on the client can act on the response anyway.** The SDK does not retry, does not queue, does not fall back. There is no branch that a status code would feed. Returning a detailed error to a caller that ignores it is decoration.

**Rate limiting works better when it is quiet.** A limiter that announces itself teaches a bad client exactly where the line is. One that drops silently makes probing for the threshold slow and boring.

**It keeps the endpoint CORS simple.** One method, no custom headers, no credentials, no preflight in the common case. Fewer moving parts between a visitor's browser and an accepted event.

And here is the bill for all that, stated plainly, because the trade is real:

| You lose                           | What to use instead                                          |
| ---------------------------------- | ------------------------------------------------------------ |
| Telling "accepted" from "dropped"  | The dashboard, which only shows stored events                |
| Seeing a validation error          | `debug: true`, which logs the exact parameters the SDK sent  |
| Noticing you crossed a rate limit  | Server logs, where every rejection is recorded with a reason |
| Catching a typo in the tracking ID | The setup page, where the ID is generated rather than typed  |

A `204` from curl means the request reached the server. It does not mean the event was stored. If you take one thing from this page, take that.

## What fire and forget actually costs

Every hop before the queue is at most once. There is no acknowledgement the browser waits for and no retry anywhere in the SDK.

| Failure                                         | Result                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| Ad blocker blocks the script                    | Nothing sent. The dashboard cannot know it happened                  |
| Visitor's network drops mid request             | Event lost                                                           |
| Rate limit exceeded                             | Event dropped, silently, by design                                   |
| API process restarts between accept and enqueue | That event is lost                                                   |
| Redis is down                                   | Requests rejected while it is down, because the limiter fails closed |

After the queue it is a different story. Jobs retry three times with exponential backoff, and a job that fails all three lands in a dead letter queue called `events-failed` with its payload, its error, and its attempt count, so a bad deploy leaves evidence instead of a hole.

The honest summary: Pulse is built for traffic measurement, where losing a fraction of a percent of events changes no decision you would make from the chart. It is not built for billing, audit trails, or anything where a missing row is a bug rather than noise. Those need acknowledgements, and acknowledgements need the visitor's browser to wait.

## The queue absorbs the spikes

Web traffic is bursty. Disks are not. A queue between them lets each behave the way it wants to.

```
 arriving   ▁▁▂▅███████▅▂▁▁▁▁▁      the burst
 queued     ▁▁▂▄▆▇▇▆▅▄▃▂▁▁▁▁▁▁      depth rises, then drains
 written    ▂▃▄▅▅▅▅▅▅▅▅▅▄▃▂▁▁▁      writes stay flat
```

Without it, a traffic spike is a write spike, and the ingestion endpoint spends the spike waiting on Postgres with visitors' connections held open. With it, the spike becomes queue depth, which is a number you can watch rather than an outage.

The queue is BullMQ on Redis. Completed jobs are trimmed to the last 1,000 and failed ones to the last 5,000, so the queue stays a buffer instead of quietly becoming a second database.

Queue depth is the health metric worth watching. The worker logs it after every flush and warns past 10,000 waiting jobs, which means writes are falling behind reads. The fix for that is another worker process, not a bigger box, because the work parallelises cleanly.

## The worker does the expensive parts

A separate process pulls jobs with a concurrency of 5 and does everything the hot path refused to do.

**Enrichment** fills in what the browser did not send:

- Browser, OS, and device from the user agent, parsed with `ua-parser-js`. Parsed results are memoised up to 5,000 entries, because real traffic reuses a few hundred user agent strings over and over.
- Country, region, and city from the IP, read from a local MaxMind file. No external call. Results are cached up to 10,000 IPs, private and loopback addresses are skipped, and if the database file is missing the worker logs it once and carries on with empty geo rather than failing every job.

The raw IP is used for that lookup. It is not what the dashboard reads back.

**Batching** is where the throughput comes from:

```
 job  job  job  ...  job          flush when either fills first:
  └────┴────┴────────┘              100 events, or 1 second
           │
           ▼
    one INSERT, 100 rows
```

A hundred single row inserts and one hundred row insert cost the database very different amounts. At ten thousand events a second, that difference is the whole design.

If a flush fails, the events go back on the front of the batch instead of being dropped, and the next flush retries them along with whatever arrived in the meantime.

The insert asks Postgres to skip duplicate rows, which will make a retried batch idempotent once `eventId` carries a unique constraint. It does not have one yet, so today a job that fails after a partial write and then retries can count a handful of events twice. Small, bounded, and worth knowing about before you use these numbers for anything that has to balance.

## Storage is a hypertable

Events land in TimescaleDB, which is Postgres with time series machinery attached. `events` is a hypertable partitioned into one chunk per day, so a query for last week reads seven chunks and skips the rest without an index doing the work.

Four indexes carry the read patterns: site and time, site and path and time, session and time, visitor and time.

Two policies run in the background:

- Chunks older than 7 days are compressed, grouped by site and ordered by time. Compressed chunks are still queryable.
- Chunks older than 90 days are dropped.

Both numbers are configuration, not belief. On your own instance they are yours to change.

## Reads come off rollups, not raw events

Counting pageviews by scanning raw events is fine until the table passes a few tens of millions of rows, at which point every dashboard load is a sequential scan and the chart takes a second to appear.

So the aggregation is done once, as data arrives, into two continuous aggregates: an hourly rollup grouped by page, referrer, browser, OS, device, and country, and a daily rollup built from the hourly one.

```
 dashboard
   ├─ overview, pages, referrers, devices, geo  ─▶ hourly_pageviews
   ├─ long date ranges                          ─▶ daily_pageviews
   └─ realtime widget, last 5 minutes           ─▶ events
```

A month of traffic becomes a few hundred rows to scan rather than a few million.

The refresh policy runs hourly, which used to mean a new event stayed invisible to the overview cards for up to an hour while the realtime widget, which reads raw events, already showed it. Two panels on one screen disagreeing about the same minute is worse than either being slightly stale, so both views run with real time aggregation on: a query unions the pre-computed rows with a live aggregate over everything newer than the last refresh. The bulk stays pre-computed, the tail is counted on the fly, and the numbers reconcile.

The realtime widget still reads raw events directly, because a five minute window over one site is a small, indexed scan and it wants per session detail the rollups do not keep.

## Asking questions in English

The dashboard also takes plain questions and answers them with generated SQL. Three things keep that from being alarming.

The model connects as a Postgres role that owns nothing and can read exactly two views, both filtered to the site you are looking at by a setting the model cannot reach or change. Generated SQL is parsed into a syntax tree and checked before it runs: one statement, `SELECT` only, no writes, nothing outside those two views. The transaction opens read only with a five second timeout.

Neither view carries anything identifying. No visitor IDs, no session IDs, no IP addresses, no URLs with query strings. The model sees the same aggregated rows a chart does.

## What happens when something breaks

| Broken               | What you see                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| Redis down           | Ingestion rejects events while it is down. The dashboard keeps working, since reads go to Postgres              |
| Postgres down        | Ingestion keeps accepting. Events pile up in the queue and drain when the database returns. Dashboards fail     |
| Worker stopped       | Same, with the queue growing until it starts again. Nothing is lost                                             |
| A poison event       | Three retries, then the dead letter queue, with the payload kept for inspection                                 |
| API process restarts | Events accepted but not yet queued are lost. Everything already queued survives, since the queue lives in Redis |

The pattern: reads and writes fail independently, and the queue is what buys time for the slow half.

## What is deliberately absent

No cookies, so no consent banner for Pulse itself. No cross site identifier, so following a person between two sites is not something the schema can express. No third party: the script comes from your API host and the rows land in your database.
