# Pulse Analytics backend

API server and event pipeline.

## Stack

Node 22 + TypeScript, run through `tsx` (no build step). Express 5, Prisma,
PostgreSQL with TimescaleDB, BullMQ on Redis, JWT auth with a Redis denylist
for revoked tokens.

## Architecture

```
Browser → POST /track → Express API → BullMQ → Worker → TimescaleDB
```

Two processes, deployed separately.

`src/index.ts` is the API. It validates events and enqueues them, and that is
all it does on the hot path, so ingestion stays fast under load.

`src/worker.ts` drains the queue, enriches each event with geo and user-agent
data, and batch-inserts. It is the only process that reads the GeoIP database.

Rate limiting is per-site by plan tier and per-IP, both in Redis. It is off in
development and on everywhere else unless `RATE_LIMIT_ENABLED` says otherwise.

## Setup

Needs Node 22+, pnpm, and Docker.

```bash
pnpm install
cp .env.example .env
```

Fill in the two token secrets. Every variable is documented in `.env.example`.

GeoIP is optional. Without `data/GeoLite2-City.mmdb` the worker logs one error
and runs with geo disabled.

## Running locally

```bash
pnpm dev
```

Starts Postgres and Redis in Docker, runs both migration systems, then the API
(cyan, port 8000) and worker (yellow) in one terminal. Killing one kills both.

Separately, if you want them in different terminals:

```bash
pnpm infra:up    # Postgres + Redis only
pnpm dev:api
pnpm dev:worker
```

`pnpm db:seed` fills the database with fake users and sites.

## Testing

216 unit tests plus an integration suite that skips itself when no Postgres is
listening, so `pnpm test` works with nothing running.

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

Artillery configs for ingestion, auth and analytics live in `tests/load/`. See
[`tests/README.md`](tests/README.md).

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Infra, migrations, API and worker |
| `pnpm dev:api` / `pnpm dev:worker` | One process only |
| `pnpm infra:up` / `pnpm infra:down` | Postgres + Redis |
| `pnpm db:migrate` | Prisma schema, then TimescaleDB migrations |
| `pnpm db:seed` | Fake users and sites |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | Checks |
| `pnpm load:*` | Artillery runs (`light`, `medium`, `heavy`, `hard`, `auth`, `analytics`) |

## API

Everything is under `/api/v1`.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | none | DB, Redis and queue status |
| `POST` | `/track` | none | Ingest an event |
| `POST` | `/auth/register` | none | Register |
| `POST` | `/auth/login` | none | Login |
| `POST` | `/auth/refresh` | cookie | New access token |
| `POST` | `/auth/logout` | bearer | Revoke token |
| `GET` `PATCH` | `/auth/me` | bearer | Current user |
| `GET` `POST` | `/sites` | bearer | List, create |
| `GET` `PUT` `DELETE` | `/sites/:id` | bearer | Read, update, delete |
| `POST` | `/sites/:id/regen-key` | bearer | New tracking key |
| `GET` | `/analytics/:siteId/*` | bearer | `overview`, `timeseries`, `pages`, `referrers`, `devices`, `geo`, `realtime`, `events` |
| `POST` | `/ai/:siteId/ask` | bearer | Natural-language query |
| `GET` `DELETE` | `/ai/:siteId/conversations` | bearer | Query history |

`/track` accepts any origin. Everything else is restricted to `FRONTEND_URL`.

## Deployment

Production runs the same compose stack with the API and worker in Docker too.
`docker-compose.prod.yml` layers them onto the base file.

```bash
cp .env.example .env.prod                 # hosts become "postgres" and "redis"
scp GeoLite2-City.mmdb <box>:backend/data/

export COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
export COMPOSE_ENV_FILE=.env.prod
docker compose up -d --build
```

The API container runs migrations before starting. `prisma migrate deploy` takes
an advisory lock, so several containers booting together is safe.

Postgres and Redis bind to `127.0.0.1` by default, which keeps them off the
internet on a public VM. The load rig puts the data layer on its own box with
`PG_BIND=0.0.0.0` and a security group, and starts the API boxes with
`docker compose up -d --no-deps api worker`. Full walkthrough in
[`notes/aws-load-rig.md`](../notes/aws-load-rig.md).

`GET /api/v1/health` returns 503 when Postgres or Redis is unreachable.
