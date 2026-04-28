# Backend Test Scope

**Framework**: [Vitest](https://vitest.dev/) — native ESM + TypeScript, no transform config needed.  
**Test runner**: `pnpm test`  
**Files live in**: `backend/tests/unit/` and `backend/tests/load/`

> **On integration tests**: Skip for now. The repositories are thin Prisma wrappers and the services mock them in unit tests. Integration tests make sense later when you want end-to-end DB coverage (e.g. TimescaleDB continuous aggregates). Add a `tests/integration/` folder then.

---

## File 1 — Unit Tests (`tests/unit/`)

### `utils/app-error.test.ts`

- [x] `AppError` sets `statusCode`, `message`, `isOperational = true`, `type = "app"`
- [x] `AppError` sets optional `code` when provided
- [x] `AppError` omits `code` when not provided
- [x] `AppError` is instanceof `Error`
- [x] Stack trace captured (`captureStackTrace` called)

---

### `utils/gen-tracking.test.ts`

- [x] `generateTrackingId()` returns string starting with `"pk-"`
- [x] `generateTrackingId()` total length is 35 chars (`pk-` + 32 base64url)
- [x] `generateTrackingId()` matches regex `/^pk-[a-zA-Z0-9_-]{32}$/`
- [x] `generateTrackingId()` returns unique values on repeated calls
- [x] `generateEmbedCode(trackingId)` contains the trackingId in the output
- [x] `generateEmbedCode(trackingId)` contains `pulse-sdk.js`
- [x] `generateEmbedCode(trackingId)` contains `window.pulse`

---

### `utils/ip.test.ts`

- [x] `extractClientIp()` returns first IP from `x-forwarded-for` header (comma-separated)
- [x] `extractClientIp()` trims whitespace from `x-forwarded-for` value
- [x] `extractClientIp()` falls back to `req.ip` when header absent
- [x] `extractClientIp()` returns `"unknown"` when both header and `req.ip` are missing

---

### `utils/async-handler.test.ts`

- [x] Calls the wrapped async function with `(req, res, next)`
- [x] Does NOT call `next` when the function resolves cleanly
- [x] Calls `next(err)` when the function rejects with an error

---

### `middleware/validate.test.ts`

- [x] Valid body matching schema calls `next()` with no args
- [x] Invalid body returns `400` with `{ message: "Validation error", errors: [...] }`
- [x] Extra fields allowed by schema pass through

---

### `middleware/error.middleware.test.ts`

- [x] `entity.parse.failed` error returns `400` with `"Invalid JSON in request body"`
- [x] `AppError` returns correct `statusCode` and `message`
- [x] `AppError` with `code` includes `code` in response
- [x] Unknown error returns `500` with `"Internal server error"`
- [x] Unknown error is logged via logger

---

### `middleware/request-id.test.ts`

- [x] Uses `x-request-id` header value when present
- [x] Generates a UUID when header is absent
- [x] Sets `x-request-id` response header
- [x] Sets `req.id`
- [x] Calls `next()`

---

### `middleware/auth.middleware.test.ts`

Mocks: `jsonwebtoken`, `ioredis`

- [x] Missing `Authorization` header → throws `AppError(401, "No token provided")`
- [x] Valid token with no `jti` → sets `req.user` and calls `next()`
- [x] Valid token with `jti` not in Redis denylist → sets `req.user` and calls `next()`
- [x] Valid token with `jti` in Redis denylist → throws `AppError(401, "Token revoked")`
- [x] Malformed / expired token → throws `AppError(401, "Unauthorized")`

---

### `modules/auth/auth.service.test.ts`

Mocks: `auth.repository`, `bcrypt`, `jsonwebtoken`

**`registerUser`**

- [x] Missing email → throws `AppError(400, ...)`
- [x] Missing password → throws `AppError(400, ...)`
- [x] Existing user → throws `AppError(409, "User already exists")`
- [x] New user → hashes password with bcrypt, calls `createUser`, returns `{ accessToken, refreshToken }`
- [x] Both tokens are non-empty strings

**`loginUser`**

- [x] User not found → throws `AppError(404, ...)`
- [x] Wrong password → throws `AppError(400, ...)`
- [x] Correct credentials → calls `updateLastLoginAt`, returns tokens

**`refreshTokenService`**

- [x] Invalid/expired refresh token → `jwt.verify` throws → propagates error
- [x] Valid token → returns new `accessToken`

**`getUserById`**

- [x] User not found → returns `null`
- [x] User found → returns public shape (no `password`, no `createdAt`, no `updatedAt`)

**`updateUserService`**

- [x] User not found → throws `AppError(404, ...)`
- [x] No fields provided → throws `AppError(400, "At least one field...")`
- [x] `name` update only → calls `updateUserById` with just `name`
- [x] `password` update → hashes new password before saving
- [x] Returns public user shape

**`generateTokens` (internal, tested via register/login)**

- [x] Access token contains `userId`, `email`, `jti`
- [x] Refresh token contains `userId`, `email`, `jti`
- [x] Tokens are distinct

---

### `modules/auth/auth.types.test.ts` (Zod schemas)

**`registerUserSchema`**

- [x] Valid input passes
- [x] Missing `email` fails
- [x] Invalid email format fails
- [x] Password < 8 chars fails
- [x] Password with no uppercase fails
- [x] Password with no digit fails

**`loginUserSchema`**

- [x] Valid input passes
- [x] Empty password fails

**`updateUserSchema`**

- [x] All fields optional — empty object passes
- [x] Invalid email format fails
- [x] Weak password fails

---

### `modules/ingestion/track.service.test.ts`

**`getClientIp`**

- [x] Extracts first IP from `x-forwarded-for` (comma + space separated)
- [x] Extracts first IP from array-form header
- [x] Falls back to `req.socket.remoteAddress`

**`buildRawEvent`**

- [x] Parses valid URL into `urlHostname`, `urlPathname`
- [x] Strips empty `urlSearch` (bare `?`)
- [x] Stores non-empty `urlSearch`
- [x] Malformed URL → `urlHostname = ""`, `urlPathname = rawUrl`
- [x] Uses provided `ts` param as timestamp
- [x] Uses `now` when `ts` is absent
- [x] Sets `eventId` as a UUID
- [x] Sets `siteId` from argument
- [x] Sets empty referrer to `undefined`

---

### `modules/ingestion/track.types.test.ts` (Zod schema)

**`TrackQuerySchema`**

- [x] Valid minimal payload passes (`tid`, `t`, `dl` only)
- [x] Invalid `tid` format fails (not `pk-...`)
- [x] Invalid `t` (unknown event type) fails
- [x] Invalid `dl` (not a URL) fails
- [x] Invalid `cid` (not UUID) fails
- [x] `ep` JSON string parses to object
- [x] Malformed `ep` JSON becomes `undefined` (no throw)
- [x] `sr` / `vp` regex `NxN` — valid and invalid
- [x] `ts` non-numeric string → `undefined`
- [x] `debug` coerces `"true"` → `true`

---

### `modules/ingestion/track.cache.test.ts`

Mocks: `ioredis`, `track.repository`

- [x] Cache HIT → returns parsed JSON, does NOT call `getSiteByTrackingId`
- [x] Cache MISS → calls `getSiteByTrackingId`, stores result in Redis, returns site
- [x] Cache MISS, site not found → does NOT call `setex`, returns `null`
- [x] Concurrent MISS (inflight dedup) → `getSiteByTrackingId` called only once
- [x] Redis error → falls back to DB (`getSiteByTrackingId`)
- [x] `invalidateSiteCache` calls `redis.del` with correct key

---

### `modules/site/site.service.test.ts`

Mocks: `site.repository`, `track.cache`, `gen-tracking`

**`createSiteService`**

- [x] Domain already exists → throws `AppError(409, "Site already exists")`
- [x] New domain → calls `generateTrackingId`, `createSite`, returns `{ site, embedCode }`
- [x] `embedCode` contains the generated trackingId

**`getSiteByIdService`**

- [x] Site not found → throws `AppError(404, "Site not found")`
- [x] Site found → returns site

**`updateSiteService`**

- [x] Site not owned by user → throws `AppError(404, "Site not found")`
- [x] New domain already taken → throws `AppError(409, "Domain already exists")`
- [x] Same domain (no change) → skips domain conflict check
- [x] Valid update → returns updated site

**`deleteSiteService`**

- [x] Site not found → throws `AppError(404, "Site not found")`
- [x] Found → calls `deleteSite` then `invalidateSiteCache`

**`regenerateTrackingIdService`**

- [x] Site not found → throws `AppError(404, ...)`
- [x] Found → invalidates old cache, generates new trackingId, returns `{ site, embedCode }`

---

### `modules/analytics/analytics.service.test.ts`

Mocks: `analytics.repository`

**`resolveDateRange`**

- [x] No args → `toDate` ≈ now, `fromDate` ≈ 7 days ago
- [x] Custom `from` / `to` strings → correct Date objects
- [ ] Invalid date string → `new Date(invalid)` is `Invalid Date` (document: no validation currently)

**`verifySiteOwnership`**

- [x] Site found → returns site
- [x] Site not found → throws `AppError(403, "Site not found or access denied")`

**`getOverview` / `getTimeseries` / `getTopPages` / `getReferrers` / `getDevices` / `getGeo` / `getRealtime`**

- [x] Each calls `verifySiteOwnership` first
- [x] Each calls `resolveDateRange` then delegates to corresponding repository function
- [x] Unauthorized user → throws 403 before hitting repository

---

### `services/geo.service.test.ts`

Mocks: `@maxmind/geoip2-node` Reader

**`lookupGeoIp`**

- [x] `null` IP → returns empty `GeoInfo`
- [x] Private IP `127.0.0.1` → returns empty
- [x] Private IP `10.x.x.x` → returns empty
- [x] Private IP `192.168.x.x` → returns empty
- [x] Private IP `172.16.x.x` → returns empty
- [x] IPv4-mapped IPv6 `::ffff:1.2.3.4` → normalized to `1.2.3.4` before lookup
- [x] Public IP + reader loaded → returns populated `GeoInfo`
- [x] Public IP + `db.city()` throws → returns empty (not found in DB)
- [ ] Cache HIT on second lookup for same IP → reader NOT called again _(skipped: module-level cache shared across tests; covered indirectly by test ordering)_
- [ ] Cache evicted when size hits 10,000 → map cleared _(skipped: impractical in unit test without exporting cache)_

**`isPrivateIp` / `normalizeIp`** (tested indirectly via `lookupGeoIp`)

- [x] `::ffff:192.168.1.1` → private after normalization
- [ ] `172.31.x.x` → private
- [x] `172.15.x.x` → NOT private

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

1. ~~Install Vitest + test utilities in backend~~ ✅
2. ~~`utils/` tests (zero mocks — fastest wins)~~ ✅
3. ~~`middleware/` tests~~ ✅
4. ~~`modules/auth/auth.types.test.ts` (Zod, zero mocks)~~ ✅
5. ~~`modules/ingestion/track.types.test.ts` (Zod)~~ ✅
6. ~~`modules/auth/auth.service.test.ts`~~ ✅
7. ~~`modules/ingestion/track.service.test.ts`~~ ✅
8. ~~`modules/ingestion/track.cache.test.ts`~~ ✅
9. ~~`modules/site/site.service.test.ts`~~ ✅
10. ~~`modules/analytics/analytics.service.test.ts`~~ ✅
11. ~~`services/geo.service.test.ts`~~ ✅
12. Load: `auth.yml`
13. Load: `analytics.yml`
