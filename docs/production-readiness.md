# Production Readiness Audit — Pulse Analytics Backend

> Generated: 2026-04-24. Covers backend code as of commit `6063821`.

---

## Quick Summary

The backend has a solid foundation — clean module boundaries, typed throughout, good separation of concerns. What's missing is the hardening layer: input validation gaps, missing rate limiting, race conditions in the worker, and no observability tooling. Below is everything needed before pointing real traffic at this.

---

## Priority Levels

| Priority | Fix when |
|----------|----------|
| **P0** | Before any production traffic |
| **P1** | Before public launch |
| **P2** | Within first month of launch |
| **P3** | Nice-to-have / future roadmap |

---

## P0 — Must Fix Before Launch

### 1. Worker: Events Lost on Process Crash

**File:** `src/workers/event.worker.ts`

BullMQ marks a job "completed" the moment the worker function returns — before `flushBatch()` writes to Postgres. If the process dies between ACK and DB write, those events are gone permanently.

**Fix:** Move the DB insert inside the job handler directly and remove the async batching accumulator. Or use BullMQ's `lockDuration` + `stalledInterval` so jobs re-queue on crash.

```ts
// current — unsafe
const worker = new Worker("event", async (job) => {
  const enriched = await enrichEvent(job.data);
  batch.push(enriched);         // ← job ACK'd here, before DB write
  if (batch.length >= BATCH_SIZE) await flushBatch();
});

// safer pattern — keep batch but don't let BullMQ ACK until flush succeeds
// use lockDuration long enough to cover flush time
```

Also: `batch` is a module-level array shared across concurrent workers (`concurrency: 5`). Five fibers pushing into the same array with no mutex is a data race.

---

### 2. Rate Limiting: Fail-Open on Redis Down

**File:** `src/modules/ingestion/track.ratelimit.ts`

When Redis is unavailable, `checkRateLimit()` and `checkSiteRateLimit()` catch the error and return `{ allowed: true }`. This means the ingestion endpoint accepts unlimited traffic if Redis goes down.

**Fix:** Fail-closed. Reject requests when the rate limiter state is unknown.

```ts
} catch (err) {
  logger.error("[ratelimit] Redis error — rejecting request (fail-closed)", err);
  return { allowed: false, reason: "rate_limit_unavailable" };
}
```

---

### 3. No Rate Limiting on Auth Endpoints

**File:** `src/modules/auth/auth.routes.ts`

`/auth/register`, `/auth/login`, `/auth/refresh` have zero rate limiting. An attacker can run credential-stuffing or brute-force attacks at full speed.

**Fix:** Add rate limiting middleware. The empty `src/middleware/rate-limiter.ts` file is the right place.

```ts
// src/middleware/rate-limiter.ts
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redis } from "@/config/redis.ts";

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  message: { status: "error", message: "Too many attempts" },
});
```

Apply to routes:
```ts
router.post("/login", authRateLimit, validate(loginUserSchema), login);
router.post("/register", authRateLimit, validate(registerUserSchema), register);
```

---

### 4. Graceful Shutdown Missing

**Files:** `src/index.ts`, `src/config/redis.ts`, `src/config/prisma.ts`

The API server has no SIGTERM/SIGINT handler. On container restart/deploy, in-flight requests are killed immediately.

**Fix:** Add shutdown handlers to `src/index.ts`:

```ts
const shutdown = async () => {
  logger.info("[server] Shutting down...");
  server.close(async () => {
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

---

### 5. Hardcoded Embed URL in Tracking Script

**File:** `src/helpers/gen-tracking.ts`

The generated embed snippet hardcodes `api.pulse.com`. This URL goes into every customer's website.

```ts
// currently hardcoded
const script = `<script src="https://api.pulse.com/track.js" ...>`
```

**Fix:** Pull from env var:

```ts
// env.ts — add:
TRACKING_SCRIPT_URL: z.string().url().default("http://localhost:8000"),

// gen-tracking.ts
const script = `<script src="${env.TRACKING_SCRIPT_URL}/track.js" ...>`
```

---

## P1 — Before Public Launch

### 6. Request IDs / Trace IDs

Every log line should carry a request ID so you can correlate across the API → worker → DB path. Currently logs are anonymous.

**Fix:** Add a `requestId` middleware and thread it through the logger.

```ts
// src/middleware/request-id.ts
import { randomUUID } from "crypto";

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  req.id = req.headers["x-request-id"] as string ?? randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
};
```

Extend `express.d.ts`:
```ts
interface Request { id?: string; }
```

Then pass `req.id` to logger in `asyncHandler`.

---

### 7. Error Tracking (Sentry)

**File:** `src/middleware/error.middleware.ts`

Errors go to `console.error`. In production you need a paper trail with stack traces, request context, and alerting.

**Fix:** Add Sentry (or any equivalent — Highlight.io, Axiom, etc.):

```bash
pnpm add @sentry/node
```

```ts
// src/index.ts — init before routes
Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });

// error.middleware.ts — capture before responding
Sentry.captureException(err);
```

Add `SENTRY_DSN` to env schema (optional, skip if not set).

---

### 8. JWT Token Revocation

**File:** `src/modules/auth/auth.controller.ts`

Logout clears the cookie but the JWT is still valid until it expires. If a token is stolen, there's no way to invalidate it.

**Fix:** Maintain a Redis denylist of logged-out token JTIs:

```ts
// on logout
const payload = jwt.decode(token) as { jti?: string; exp?: number };
if (payload.jti && payload.exp) {
  const ttl = payload.exp - Math.floor(Date.now() / 1000);
  await redis.set(`denylist:${payload.jti}`, "1", "EX", ttl);
}

// in auth.middleware.ts — add check
const jti = payload.jti;
if (jti && await redis.exists(`denylist:${jti}`)) {
  throw new AppError(401, "Token revoked");
}
```

Generate `jti` in `generateTokens()` using `randomUUID()`.

---

### 9. Date Validation in Analytics Queries

**File:** `src/modules/analytics/analytics.types.ts`

`from` and `to` are `z.string().optional()` — no validation that they're actual dates. `new Date("not-a-date")` is `Invalid Date` which produces broken SQL.

**Fix:**

```ts
const dateString = z.string().refine(
  (s) => !isNaN(Date.parse(s)),
  { message: "Invalid date" }
).optional();

export const AnalyticsQuerySchema = z.object({
  from: dateString,
  to:   dateString,
  interval: z.enum(["hour", "day"]).default("day"),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
```

---

### 10. Password Complexity

**File:** `src/modules/auth/auth.types.ts`

`z.string().min(8)` accepts `"aaaaaaaa"`. Add meaningful complexity:

```ts
const password = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/, "Must contain uppercase")
  .regex(/[0-9]/, "Must contain number");
```

---

### 11. Cache Stampede on Site Lookup

**File:** `src/modules/ingestion/track.cache.ts`

On cache miss, every concurrent request fires a DB query simultaneously. Under load (many events for a cold site), this hammers the DB.

**Fix:** Use a per-key in-flight promise map:

```ts
const inflight = new Map<string, Promise<Site | null>>();

export async function getSiteByTrackingId(trackingId: string) {
  const cached = await redis.get(`site:${trackingId}`);
  if (cached) return JSON.parse(cached);

  if (inflight.has(trackingId)) return inflight.get(trackingId);

  const promise = fetchFromDb(trackingId).finally(() => inflight.delete(trackingId));
  inflight.set(trackingId, promise);
  return promise;
}
```

---

### 12. Docker: No Non-Root User, No HEALTHCHECK

**File:** `Dockerfile`

Container runs as root. Any RCE vulnerability gives full container control.

```dockerfile
# Add before CMD:
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:8000/api/v1/health || exit 1
```

---

## P2 — First Month of Launch

### 13. NODE_ENV Should Be an Enum

**File:** `src/config/env.ts`

```ts
NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
```

Currently accepts any string, meaning typos like `NODE_ENV=producton` silently fall through.

---

### 14. GeoIP Private IP Detection Is Buggy

**File:** `src/workers/geo.service.ts`

```ts
// line ~110 — wrong: matches 172.20-172.29 AND 172.30-172.31
ip.startsWith("172.2")

// correct
const PRIVATE_172 = /^172\.(1[6-9]|2\d|3[01])\./;
```

Also missing `::1` (IPv6 loopback). Private IPs should return a null geo result, not trigger an error.

---

### 15. UAParser Instantiated Per Event

**File:** `src/workers/event.worker.ts`

```ts
// line 90 — called for every single event
const parser = new UAParser(uaString);
```

`UAParser` construction is not free. Cache parsed results by UA string (UA strings repeat heavily):

```ts
const uaCache = new Map<string, UAParser.IResult>();

function parseUA(ua: string) {
  if (uaCache.has(ua)) return uaCache.get(ua)!;
  const result = new UAParser(ua).getResult();
  if (uaCache.size > 5_000) uaCache.clear(); // simple eviction
  uaCache.set(ua, result);
  return result;
}
```

---

### 16. Tracking ID Entropy Loss

**File:** `src/helpers/gen-tracking.ts`

`randomBytes(29)` → hex → base64 → filter alphanumeric loses ~50% of bits. The output ID has less entropy than intended.

**Fix:** Generate directly as base64url with no filtering:

```ts
import { randomBytes } from "crypto";

export function genTrackingId(): string {
  return randomBytes(24).toString("base64url"); // 192 bits, URL-safe, no filtering needed
}
```

---

### 17. `trust proxy` Is Too Permissive

**File:** `src/app.ts`

```ts
app.set("trust proxy", true); // trusts ALL proxies — unsafe
```

This means anyone can spoof `X-Forwarded-For`. Set to the number of proxy hops in front of your app:

```ts
app.set("trust proxy", 1); // trust one hop (e.g. your ALB/nginx)
```

---

### 18. Soft Deletes for Sites

**File:** `src/modules/site/site.repository.ts`

Hard-deleting a site destroys all event history association. Add `deletedAt: DateTime?` to the Site model and filter it in queries.

---

## Refactoring Recommendations

### Remove Empty File

`src/middleware/rate-limiter.ts` is empty. Either implement it (see P0 item 3) or delete it — an empty file with a meaningful name is misleading.

---

### Flatten `src/config/index.ts`

`config.jwt.*` fields duplicate what's already in `env.*`. Callers import both. Pick one source of truth — either use `env` directly everywhere, or route everything through `config`. Currently mixed.

---

### `AppError` Needs Error Codes

```ts
// current
throw new AppError(404, "User not found");

// better — client can switch on code, logs are searchable
throw new AppError(404, "User not found", "USER_NOT_FOUND");
```

Add `code?: string` to `AppError` and include it in error responses. Makes frontend error handling and log queries much easier.

---

### Extract IP Parsing to a Utility

IP extraction logic is split across `track.service.ts` and `track.ratelimit.ts`. Both do slightly different things. Consolidate into one `src/utils/ip.ts` used by both:

```ts
export function extractClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  }
  return req.ip ?? "unknown";
}
```

---

## Folder Structure Changes

Current structure is reasonable. A few additions would help as the codebase grows:

```
backend/src/
├── config/
├── helpers/
├── middleware/
├── modules/
│   ├── analytics/
│   ├── auth/
│   ├── ingestion/
│   └── site/
├── services/          ← add this (cross-module shared services)
│   ├── email.service.ts      (SES or SMTP when needed)
│   └── storage.service.ts    (S3 when needed)
├── types/
├── utils/
│   ├── ip.ts          ← extract from track.service + ratelimit
│   └── ...
└── workers/
```

Move `src/helpers/gen-tracking.ts` → `src/utils/gen-tracking.ts`. The `helpers/` name is vague. `utils/` is already established.

---

## Test Coverage Plan

### What to Test (by layer)

#### Unit Tests — `tests/unit/`

These test pure functions in isolation. No DB, no Redis, no HTTP.

| File | What to test |
|------|-------------|
| `src/utils/ip.ts` | Header parsing, IPv6 handling, spoofed header detection |
| `src/helpers/gen-tracking.ts` | ID format, uniqueness, length, URL-safety |
| `src/modules/analytics/analytics.service.ts` | `resolveDateRange()` defaults, boundary dates |
| `src/modules/ingestion/track.service.ts` | URL parsing edge cases, event building from params |
| `src/modules/ingestion/track.types.ts` | Schema validation — valid inputs, invalid inputs, edge cases |
| `src/workers/geo.service.ts` | Private IP detection, cache eviction, IPv6 normalization |
| `src/modules/auth/auth.types.ts` | Password rules, email validation |

#### Integration Tests — `tests/integration/`

These spin up Postgres + Redis (use `docker-compose.test.yml`) and test real DB interactions.

| Area | What to test |
|------|-------------|
| Auth flow | Register → login → access protected route → logout → token invalid |
| Site management | Create site → get tracking ID → update domain → delete |
| Event ingestion | POST /track → event appears in DB → analytics query returns it |
| Rate limiting | Exceed site rate limit → 204 returned → count resets after window |
| Analytics queries | Date range filtering, empty result sets, large result sets |
| Cache | Site cached after first lookup → cache invalidated after site update |

#### Load Tests — `tests/load/`

Already have Artillery setup. Extend it:

| Scenario | Target |
|----------|--------|
| Ingestion throughput | 10k events/sec sustained |
| Analytics queries under load | P99 < 500ms with 100k events in DB |
| Auth endpoint under brute force | Rate limit kicks in, no DB overload |

---

### Recommended Test Stack

```bash
pnpm add -D vitest @vitest/coverage-v8 supertest @types/supertest
```

- **Vitest** — fast, native ESM, compatible with your `tsx` setup
- **Supertest** — HTTP integration tests against the Express app
- No Jest (slower, worse ESM support)

Add to `package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

---

### Coverage Target

| Layer | Target |
|-------|--------|
| Utils / helpers | 90%+ |
| Service layer | 80%+ |
| Controllers | 70%+ (via integration) |
| Repository layer | 60%+ (via integration) |
| Workers | 50%+ |

Start with the service layer — highest return on investment, pure logic, fast to run.

---

## What NOT to Test

- Prisma internals (trust the library)
- Third-party SDK behavior (GeoIP library, UAParser)
- Docker compose setup
- TypeScript type checking (that's `tsc`'s job)
