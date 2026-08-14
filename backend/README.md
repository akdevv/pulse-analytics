# Pulse Analytics — Backend

API server and event processing pipeline for Pulse Analytics.

## Stack

- **Runtime** — Node.js + TypeScript (via `tsx`)
- **Framework** — Express 5
- **Database** — PostgreSQL + TimescaleDB (time-series queries)
- **ORM** — Prisma
- **Queue** — BullMQ (backed by Redis)
- **Cache** — Redis (ioredis)
- **Auth** — JWT (access + refresh tokens, Redis denylist on logout)

## Architecture

```
Browser → POST /track → Express API → BullMQ Queue → Worker → TimescaleDB
```

- **API** (`src/index.ts`) — handles HTTP, validates events, enqueues them
- **Worker** (`src/worker.ts`) — dequeues events, enriches with geo + UA info, batch-inserts into DB
- **GeoIP** — MaxMind GeoLite2 database for IP → country/city lookup
- **Rate limiting** — per-site (by plan tier) + per-IP, backed by Redis

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for local Postgres + Redis)
- MaxMind GeoLite2 database at `./data/GeoLite2-City.mmdb`

### Setup

```bash
# Install dependencies
pnpm install

# Copy env file and fill in values
cp .env.example .env

# Run migrations
pnpm exec prisma migrate deploy  # Prisma schema
pnpm db:migrate                  # TimescaleDB hypertables

# (Optional) Seed with fake data
pnpm seed
```

### Running locally

```bash
pnpm dev
```

Starts Postgres + Redis via Docker, then the API and worker together in one terminal.

| Process | Port | Color  |
| ------- | ---- | ------ |
| API     | 8000 | cyan   |
| Worker  | —    | yellow |

If you want to run them separately:

```bash
pnpm infra:up    # start Postgres + Redis only
pnpm dev:api     # API server with hot reload
pnpm dev:worker  # event worker
```

## Testing

152 unit tests (Vitest) + Artillery load tests for ingestion, auth, and analytics.

```bash
pnpm test          # run unit tests once
pnpm test:watch    # watch mode
pnpm test:coverage # with coverage report
```

See [`tests/README.md`](tests/README.md) for load test setup and full test strategy.

## Scripts

| Command           | Description                             |
| ----------------- | --------------------------------------- |
| `pnpm dev`        | Start everything (infra + api + worker) |
| `pnpm dev:api`    | API server only (hot reload)            |
| `pnpm dev:worker` | Worker only                             |
| `pnpm infra:up`   | Start Postgres + Redis in background    |
| `pnpm infra:down` | Stop Postgres + Redis                   |
| `pnpm db:migrate` | Run TimescaleDB hypertable migrations   |
| `pnpm seed`       | Seed DB with fake users and sites       |
| `pnpm typecheck`  | Run TypeScript type checks              |
| `pnpm lint`       | Lint the codebase                       |
| `pnpm format`     | Format with Prettier                    |

## Environment Variables

| Variable               | Required | Default                     | Description                            |
| ---------------------- | -------- | --------------------------- | -------------------------------------- |
| `PORT`                 | No       | `8000`                      | API server port                        |
| `NODE_ENV`             | No       | `development`               | `development`, `production`, or `test` |
| `DATABASE_URL`         | Yes      | —                           | PostgreSQL connection string           |
| `ACCESS_TOKEN_SECRET`  | Yes      | —                           | JWT access token signing secret        |
| `REFRESH_TOKEN_SECRET` | Yes      | —                           | JWT refresh token signing secret       |
| `ACCESS_TOKEN_EXPIRY`  | No       | `15m`                       | Access token TTL                       |
| `REFRESH_TOKEN_EXPIRY` | No       | `30d`                       | Refresh token TTL                      |
| `REDIS_HOST`           | No       | `localhost`                 | Redis host                             |
| `REDIS_PORT`           | No       | `6379`                      | Redis port                             |
| `REDIS_PASSWORD`       | No       | —                           | Redis password (if auth enabled)       |
| `GEOIP_DB_PATH`        | No       | `./data/GeoLite2-City.mmdb` | Path to MaxMind GeoLite2 DB            |
| `FRONTEND_URL`         | No       | `http://localhost:3000`     | Allowed CORS origin                    |
| `TRACKING_SCRIPT_URL`  | No       | `http://localhost:8000`     | Base URL embedded in tracking snippets |

## Project Structure

```
src/
├── config/       — env, redis, prisma, queue, rate limit config
├── middleware/   — auth, error handling, rate limiting, request ID
├── modules/
│   ├── analytics/  — dashboard query endpoints
│   ├── auth/       — register, login, logout, JWT refresh
│   ├── health/     — deep health check (DB + Redis + queue)
│   ├── ingestion/  — event tracking endpoint (/track)
│   └── site/       — site management
├── services/     — shared services (GeoIP lookup)
├── types/        — shared TypeScript types
├── utils/        — logger, error class, async handler, IP extraction
├── workers/      — BullMQ event worker
└── seed/         — dev data seeding scripts
```

## API Endpoints

| Method  | Path                          | Auth   | Description           |
| ------- | ----------------------------- | ------ | --------------------- |
| `GET`   | `/api/v1/health`              | —      | Health check          |
| `POST`  | `/api/v1/auth/register`       | —      | Register              |
| `POST`  | `/api/v1/auth/login`          | —      | Login                 |
| `POST`  | `/api/v1/auth/logout`         | Bearer | Logout + revoke token |
| `POST`  | `/api/v1/auth/refresh`        | Cookie | Refresh access token  |
| `GET`   | `/api/v1/auth/me`             | Bearer | Get current user      |
| `PATCH` | `/api/v1/auth/me`             | Bearer | Update current user   |
| `GET`   | `/api/v1/sites`               | Bearer | List sites            |
| `POST`  | `/api/v1/sites`               | Bearer | Create site           |
| `GET`   | `/api/v1/analytics/:siteId/*` | Bearer | Analytics queries     |
| `POST`  | `/api/v1/track`               | —      | Ingest event (public) |

## Deployment

The `Dockerfile` builds a production image (non-root user, healthcheck included).

```bash
docker build -t pulse-backend .
```

On AWS, the recommended setup is:

- **ECS Fargate** — runs the API and worker containers
- **RDS** — managed PostgreSQL with TimescaleDB extension
- **ElastiCache** — managed Redis
- **ECR** — stores Docker images
- **ALB** — HTTPS termination + routing
