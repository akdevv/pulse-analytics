# Backend Test Scope

**Framework**: [Vitest](https://vitest.dev/) — native ESM + TypeScript, no transform config needed.  
**Test runner**: `pnpm test`  
**Files live in**: `backend/tests/unit/` and `backend/tests/load/`

> **On integration tests**: Skip for now. The repositories are thin Prisma wrappers and the services mock them in unit tests. Integration tests make sense later when you want end-to-end DB coverage (e.g. TimescaleDB continuous aggregates). Add a `tests/integration/` folder then.

---

## File 1 — Unit Tests (`tests/unit/`)

### `utils/app-error.test.ts`

- [ ] `AppError` sets `statusCode`, `message`, `isOperational = true`, `type = "app"`
- [ ] `AppError` sets optional `code` when provided
- [ ] `AppError` omits `code` when not provided
- [ ] `AppError` is instanceof `Error`
- [ ] Stack trace captured (`captureStackTrace` called)

---

### `utils/gen-tracking.test.ts`

- [ ] `generateTrackingId()` returns string starting with `"pk-"`
- [ ] `generateTrackingId()` total length is 35 chars (`pk-` + 32 base64url)
- [ ] `generateTrackingId()` matches regex `/^pk-[a-zA-Z0-9_-]{32}$/`
- [ ] `generateTrackingId()` returns unique values on repeated calls
- [ ] `generateEmbedCode(trackingId)` contains the trackingId in the output
- [ ] `generateEmbedCode(trackingId)` contains `pulse-sdk.js`
- [ ] `generateEmbedCode(trackingId)` contains `window.pulse`

---

### `utils/ip.test.ts`

- [ ] `extractClientIp()` returns first IP from `x-forwarded-for` header (comma-separated)
- [ ] `extractClientIp()` trims whitespace from `x-forwarded-for` value
- [ ] `extractClientIp()` falls back to `req.ip` when header absent
- [ ] `extractClientIp()` returns `"unknown"` when both header and `req.ip` are missing

---

### `utils/async-handler.test.ts`

- [ ] Calls the wrapped async function with `(req, res, next)`
- [ ] Does NOT call `next` when the function resolves cleanly
- [ ] Calls `next(err)` when the function rejects with an error

---

### `middleware/validate.test.ts`

- [ ] Valid body matching schema calls `next()` with no args
- [ ] Invalid body returns `400` with `{ message: "Validation error", errors: [...] }`
- [ ] Extra fields allowed by schema pass through

---

### `middleware/error.middleware.test.ts`

- [ ] `entity.parse.failed` error returns `400` with `"Invalid JSON in request body"`
- [ ] `AppError` returns correct `statusCode` and `message`
- [ ] `AppError` with `code` includes `code` in response
- [ ] Unknown error returns `500` with `"Internal server error"`
- [ ] Unknown error is logged via logger

---

### `middleware/request-id.test.ts`

- [ ] Uses `x-request-id` header value when present
- [ ] Generates a UUID when header is absent
- [ ] Sets `x-request-id` response header
- [ ] Sets `req.id`
- [ ] Calls `next()`

---

### `middleware/auth.middleware.test.ts`

Mocks: `jsonwebtoken`, `ioredis`

- [ ] Missing `Authorization` header → throws `AppError(401, "No token provided")`
- [ ] Valid token with no `jti` → sets `req.user` and calls `next()`
- [ ] Valid token with `jti` not in Redis denylist → sets `req.user` and calls `next()`
- [ ] Valid token with `jti` in Redis denylist → throws `AppError(401, "Token revoked")`
- [ ] Malformed / expired token → throws `AppError(401, "Unauthorized")`

---

### `modules/auth/auth.service.test.ts`

Mocks: `auth.repository`, `bcrypt`, `jsonwebtoken`

**`registerUser`**

- [ ] Missing email → throws `AppError(400, ...)`
- [ ] Missing password → throws `AppError(400, ...)`
- [ ] Existing user → throws `AppError(409, "User already exists")`
- [ ] New user → hashes password with bcrypt, calls `createUser`, returns `{ accessToken, refreshToken }`
- [ ] Both tokens are non-empty strings

**`loginUser`**

- [ ] User not found → throws `AppError(404, ...)`
- [ ] Wrong password → throws `AppError(400, ...)`
- [ ] Correct credentials → calls `updateLastLoginAt`, returns tokens

**`refreshTokenService`**

- [ ] Invalid/expired refresh token → `jwt.verify` throws → propagates error
- [ ] Valid token → returns new `accessToken`

**`getUserById`**

- [ ] User not found → returns `null`
- [ ] User found → returns public shape (no `password`, no `createdAt`, no `updatedAt`)

**`updateUserService`**

- [ ] User not found → throws `AppError(404, ...)`
- [ ] No fields provided → throws `AppError(400, "At least one field...")`
- [ ] `name` update only → calls `updateUserById` with just `name`
- [ ] `password` update → hashes new password before saving
- [ ] Returns public user shape

**`generateTokens` (internal, tested via register/login)**

- [ ] Access token contains `userId`, `email`, `jti`
- [ ] Refresh token contains `userId`, `email`, `jti`
- [ ] Tokens are distinct

---

### `modules/auth/auth.types.test.ts` (Zod schemas)

**`registerUserSchema`**

- [ ] Valid input passes
- [ ] Missing `email` fails
- [ ] Invalid email format fails
- [ ] Password < 8 chars fails
- [ ] Password with no uppercase fails
- [ ] Password with no digit fails

**`loginUserSchema`**

- [ ] Valid input passes
- [ ] Empty password fails

**`updateUserSchema`**

- [ ] All fields optional — empty object passes
- [ ] Invalid email format fails
- [ ] Weak password fails

---

### `modules/ingestion/track.service.test.ts`

**`getClientIp`**

- [ ] Extracts first IP from `x-forwarded-for` (comma + space separated)
- [ ] Extracts first IP from array-form header
- [ ] Falls back to `req.socket.remoteAddress`

**`buildRawEvent`**

- [ ] Parses valid URL into `urlHostname`, `urlPathname`
- [ ] Strips empty `urlSearch` (bare `?`)
- [ ] Stores non-empty `urlSearch`
- [ ] Malformed URL → `urlHostname = ""`, `urlPathname = rawUrl`
- [ ] Uses provided `ts` param as timestamp
- [ ] Uses `now` when `ts` is absent
- [ ] Sets `eventId` as a UUID
- [ ] Sets `siteId` from argument
- [ ] Sets empty referrer to `undefined`

---

### `modules/ingestion/track.types.test.ts` (Zod schema)

**`TrackQuerySchema`**

- [ ] Valid minimal payload passes (`tid`, `t`, `dl` only)
- [ ] Invalid `tid` format fails (not `pk-...`)
- [ ] Invalid `t` (unknown event type) fails
- [ ] Invalid `dl` (not a URL) fails
- [ ] Invalid `cid` (not UUID) fails
- [ ] `ep` JSON string parses to object
- [ ] Malformed `ep` JSON becomes `undefined` (no throw)
- [ ] `sr` / `vp` regex `NxN` — valid and invalid
- [ ] `ts` non-numeric string → `undefined`
- [ ] `debug` coerces `"true"` → `true`

---

### `modules/ingestion/track.cache.test.ts`

Mocks: `ioredis`, `track.repository`

- [ ] Cache HIT → returns parsed JSON, does NOT call `getSiteByTrackingId`
- [ ] Cache MISS → calls `getSiteByTrackingId`, stores result in Redis, returns site
- [ ] Cache MISS, site not found → does NOT call `setex`, returns `null`
- [ ] Concurrent MISS (inflight dedup) → `getSiteByTrackingId` called only once
- [ ] Redis error → falls back to DB (`getSiteByTrackingId`)
- [ ] `invalidateSiteCache` calls `redis.del` with correct key

---

### `modules/site/site.service.test.ts`

Mocks: `site.repository`, `track.cache`, `gen-tracking`

**`createSiteService`**

- [ ] Domain already exists → throws `AppError(409, "Site already exists")`
- [ ] New domain → calls `generateTrackingId`, `createSite`, returns `{ site, embedCode }`
- [ ] `embedCode` contains the generated trackingId

**`getSiteByIdService`**

- [ ] Site not found → throws `AppError(404, "Site not found")`
- [ ] Site found → returns site

**`updateSiteService`**

- [ ] Site not owned by user → throws `AppError(404, "Site not found")`
- [ ] New domain already taken → throws `AppError(409, "Domain already exists")`
- [ ] Same domain (no change) → skips domain conflict check
- [ ] Valid update → returns updated site

**`deleteSiteService`**

- [ ] Site not found → throws `AppError(404, "Site not found")`
- [ ] Found → calls `deleteSite` then `invalidateSiteCache`

**`regenerateTrackingIdService`**

- [ ] Site not found → throws `AppError(404, ...)`
- [ ] Found → invalidates old cache, generates new trackingId, returns `{ site, embedCode }`

---

### `modules/analytics/analytics.service.test.ts`

Mocks: `analytics.repository`

**`resolveDateRange`**

- [ ] No args → `toDate` ≈ now, `fromDate` ≈ 7 days ago
- [ ] Custom `from` / `to` strings → correct Date objects
- [ ] Invalid date string → `new Date(invalid)` is `Invalid Date` (document: no validation currently)

**`verifySiteOwnership`**

- [ ] Site found → returns site
- [ ] Site not found → throws `AppError(403, "Site not found or access denied")`

**`getOverview` / `getTimeseries` / `getTopPages` / `getReferrers` / `getDevices` / `getGeo` / `getRealtime`**

- [ ] Each calls `verifySiteOwnership` first
- [ ] Each calls `resolveDateRange` then delegates to corresponding repository function
- [ ] Unauthorized user → throws 403 before hitting repository

---

### `services/geo.service.test.ts`

Mocks: `@maxmind/geoip2-node` Reader

**`lookupGeoIp`**

- [ ] `null` IP → returns empty `GeoInfo`
- [ ] Private IP `127.0.0.1` → returns empty
- [ ] Private IP `10.x.x.x` → returns empty
- [ ] Private IP `192.168.x.x` → returns empty
- [ ] Private IP `172.16.x.x` → returns empty
- [ ] IPv4-mapped IPv6 `::ffff:1.2.3.4` → normalized to `1.2.3.4` before lookup
- [ ] Public IP + reader loaded → returns populated `GeoInfo`
- [ ] Public IP + `db.city()` throws → returns empty (not found in DB)
- [ ] Cache HIT on second lookup for same IP → reader NOT called again
- [ ] Cache evicted when size hits 10,000 → map cleared

**`isPrivateIp` / `normalizeIp`** (tested indirectly via `lookupGeoIp`)

- [ ] `::ffff:192.168.1.1` → private after normalization
- [ ] `172.31.x.x` → private
- [ ] `172.15.x.x` → NOT private

---

## File 2 — Load Tests (`tests/load/`)

### `ingestion.yml` _(already exists)_

- [ ] **Light**: 100 req/s for 90s → p99 < 200ms, 0% error
- [ ] **Medium**: 400 req/s for 60s → p99 < 500ms, error rate < 0.1%
- [ ] **Heavy**: 1000 req/s for 30s → p99 < 1s, error rate < 1%

### `auth.yml` _(to create)_

Scenarios:

- `POST /api/v1/auth/register` — unique emails per VU
- `POST /api/v1/auth/login` — fixed test user

Phases:

- [ ] Warm: 10 req/s for 30s
- [ ] Ramp: 10→50 req/s over 60s
- [ ] Sustained: 50 req/s for 60s

Thresholds:

- [ ] p99 < 300ms
- [ ] Error rate < 0.5%

### `analytics.yml` _(to create)_

Scenarios:

- Auth → fetch overview / timeseries / top-pages in sequence

Phases:

- [ ] 20 req/s for 60s sustained

Thresholds:

- [ ] p99 < 500ms
- [ ] 0% auth errors

---

## Implementation Order

1. Install Vitest + test utilities in backend
2. `utils/` tests (zero mocks — fastest wins)
3. `middleware/` tests
4. `modules/auth/auth.types.test.ts` (Zod, zero mocks)
5. `modules/ingestion/track.types.test.ts` (Zod)
6. `modules/auth/auth.service.test.ts`
7. `modules/ingestion/track.service.test.ts`
8. `modules/ingestion/track.cache.test.ts`
9. `modules/site/site.service.test.ts`
10. `modules/analytics/analytics.service.test.ts`
11. `services/geo.service.test.ts`
12. Load: `auth.yml`
13. Load: `analytics.yml`
