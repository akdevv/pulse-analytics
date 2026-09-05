# AWS load rig

The rig for the 10k RPS run. One region, one AZ, torn down the same evening.
Not a permanent home — the demo lives on the free box.

Assumes the backend already runs somewhere, so this is a copy of a working
system rather than a first deploy.

## Before launching anything

- **Billing alarm first.** The expensive mistake is leaving it up overnight.
- **One AZ.** Cross-AZ transfer is billed per GB, and at 10k RPS the API-to-data
  traffic adds up.
- **No load balancer.** ALB charges by LCU, which scales with connections and
  bandwidth. Point generators at instance IPs and aggregate afterwards.

## Shape

Ubuntu 24.04 ARM, docker installed.

| Role | Count | Type |
|---|---|---|
| Data | 1 | `c7g.xlarge` (4 vCPU) |
| API | 3 | `c7g.large` (2 vCPU) |
| Generators | 4 | `c7g.xlarge`, **spot** |

Generators are spot: stateless, and an interruption costs a rerun. The data box
must not be spot.

## Security groups

Reference each other, not CIDRs.

- `pulse-data` — inbound 5432 + 6379 from `pulse-api` only
- `pulse-api` — inbound 8000 from `pulse-gen`, 22 from your IP
- `pulse-gen` — inbound 22 from your IP

The database is never open to the internet. This is why compose defaults to
`127.0.0.1` and makes you opt out.

## Data box

```bash
git clone git@github.com:akdevv/pulse-analytics.git
cd pulse-analytics/backend
# write .env.prod: POSTGRES_PASSWORD, POSTGRES_DB
PG_BIND=0.0.0.0 REDIS_BIND=0.0.0.0 docker compose --env-file .env.prod up -d postgres redis
```

The security group protects it, not the bind address.

## API boxes (all three)

Same clone. `.env.prod` points at the data box's **private** IP and sets
`RATE_LIMIT_ENABLED=false` — otherwise the run measures the rate limiter, not
the pipeline. Copy `GeoLite2-City.mmdb` into `backend/data/` on each box, since
every box runs a worker.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  --env-file .env.prod up -d --build --no-deps api worker
```

`--no-deps` stops it starting its own Postgres. Each box builds its own image
(~2 min), so no registry is needed.

All three run migrations on boot. Safe: `prisma migrate deploy` takes a Postgres
advisory lock, so racing containers serialise.

## Tune before the run

**Connections.** `src/config/prisma.ts` sets `max: 5` per process. 3 API + 3
workers = 30, against Postgres's default `max_connections` of 100. Fine as-is;
raise it before scaling past six boxes.

**Aggregate refresh.** Continuous aggregates refresh hourly with real-time
aggregation on, so every dashboard query live-computes everything since the last
refresh. At 10k RPS that is tens of millions of rows. Drop `schedule_interval`
to a minute or two first, or analytics will look broken for reasons unrelated to
ingestion.

## Generators

Artillery cannot produce 10k RPS. Use `k6` or `bombardier`. Four boxes at ~2.5k
RPS each, started together, pointed at the three API IPs.

## During and after

Capture graphs while it runs — they cannot be reconstructed later.

Track p50/p95/p99, error rate, queue depth, DB write lag, CPU/memory. Confirm
the queue drains after the run: a backlog that never clears means the worker is
the ceiling, which is a finding worth writing down.

Then terminate everything, volumes included.
