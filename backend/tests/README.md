# Backend Tests

## Unit Tests

**Framework**: Vitest — native ESM + TypeScript, no transform needed.

```bash
pnpm test            # run once
pnpm test:watch      # watch mode
pnpm test:coverage   # with v8 coverage report
```

### Coverage — 152 tests across 16 files

| Area       | File                                          | Tests |
| ---------- | --------------------------------------------- | ----- |
| Utils      | `utils/app-error.test.ts`                     | 16    |
|            | `utils/gen-tracking.test.ts`                  | 7     |
|            | `utils/ip.test.ts`                            | 4     |
|            | `utils/async-handler.test.ts`                 | 3     |
| Middleware | `middleware/validate.test.ts`                 | 3     |
|            | `middleware/error.middleware.test.ts`         | 5     |
|            | `middleware/request-id.test.ts`               | 5     |
|            | `middleware/auth.middleware.test.ts`          | 5     |
| Auth       | `modules/auth/auth.types.test.ts`             | 10    |
|            | `modules/auth/auth.service.test.ts`           | 14    |
| Ingestion  | `modules/ingestion/track.types.test.ts`       | 12    |
|            | `modules/ingestion/track.service.test.ts`     | 12    |
|            | `modules/ingestion/track.cache.test.ts`       | 6     |
| Site       | `modules/site/site.service.test.ts`           | 12    |
| Analytics  | `modules/analytics/analytics.service.test.ts` | 16    |
| Services   | `services/geo.service.test.ts`                | 10    |

### Mocking strategy

- **Utils** — no mocks, pure functions
- **Middleware** — mock `jsonwebtoken`, `redis`, `logger`
- **Services** — mock repositories, external libs (`bcrypt`, `jwt`, `@maxmind/geoip2-node`)
- No integration tests (repositories are thin Prisma wrappers — add `tests/integration/` when DB coverage is needed)

---

## Load Tests

**Tool**: [Artillery](https://www.artillery.io/)

```bash
# Install Artillery globally (one-time)
npm install -g artillery

# Run a specific load test (output saved to tests/load/reports/)
npx artillery run tests/load/ingestion-light.yml  --output tests/load/reports/ingestion-light.json
npx artillery run tests/load/ingestion-medium.yml --output tests/load/reports/ingestion-medium.json
npx artillery run tests/load/ingestion-heavy.yml  --output tests/load/reports/ingestion-heavy.json
npx artillery run tests/load/auth.yml             --output tests/load/reports/auth.json
npx artillery run tests/load/analytics.yml        --output tests/load/reports/analytics.json

# Convert a report to HTML
npx artillery report tests/load/reports/ingestion-light.json
```

> Report files land in `tests/load/reports/` which is gitignored.

### Ingestion

Three separate files targeting `POST /api/v1/track`.

| File                   | RPS    | Duration              | p99 target | Error target |
| ---------------------- | ------ | --------------------- | ---------- | ------------ |
| `ingestion-light.yml`  | 100    | 90s                   | < 200ms    | 0%           |
| `ingestion-medium.yml` | 400    | 60s (+ 60s ramp)      | < 500ms    | < 0.1%       |
| `ingestion-heavy.yml`  | 10,000 | 20 min (+ 2 min ramp) | < 1s       | < 1%         |

> **Heavy test**: A single Artillery process caps at ~2-3k RPS. Use workers or distributed mode:
>
> ```bash
> npx artillery run --workers 8 tests/load/ingestion-heavy.yml --output tests/load/reports/ingestion-heavy.json
> # or distributed (requires Artillery Pro / Cloud):
> npx artillery run-distributed tests/load/ingestion-heavy.yml --output tests/load/reports/ingestion-heavy.json
> ```

### Auth

Targets `POST /api/v1/auth/register` and `POST /api/v1/auth/login`.

| Phase     | RPS     | Duration |
| --------- | ------- | -------- |
| Warm      | 10      | 30s      |
| Ramp      | 10 → 50 | 60s      |
| Sustained | 50      | 60s      |

Thresholds: p99 < 300ms, error rate < 0.5%.

**Prerequisite**: create the fixed login user before running:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Load Test","email":"loadtest@example.com","password":"LoadTest1!"}'
```

### Analytics

Auth → overview → timeseries → top-pages in sequence. 20 RPS sustained for 60s.

Thresholds: p99 < 500ms, 0 auth errors.

**Prerequisites**:

1. Create the test user (see auth section above)
2. Create a site and copy its ID
3. Replace `REPLACE_WITH_REAL_SITE_ID` in `tests/load/analytics.yml`

```bash
# Login and grab a token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"loadtest@example.com","password":"LoadTest1!"}' \
  | jq -r '.data.accessToken')

# Create a site
curl -X POST http://localhost:8000/api/v1/sites \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Load Test Site","domain":"loadtest.example.com"}'
# Copy the returned site id into analytics.yml
```
