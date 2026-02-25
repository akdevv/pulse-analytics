pulse-analytics/
├── frontend/                          # Next.js (separate, not covered here)
│
└── backend/
    ├── package.json                   # Root scripts: dev, build, lint, test
    ├── tsconfig.json                  # Base TS config (strict mode)
    ├── .env.example                   # All env vars documented
    ├── .env
    ├── .eslintrc.js
    ├── .prettierrc
    ├── docker-compose.yml             # Local: Postgres, Redis, LocalStack (SQS)
    │
    ├── prisma/
    │   ├── schema.prisma              # User, Site, Event models
    │   └── migrations/
    │
    ├── scripts/
    │   ├── seed.ts                    # Insert test users, sites, events
    │   ├── setup-localstack.sh        # Create SQS queues on LocalStack
    │   └── setup-timescale.sql        # Enable extension, create hypertable
    │
    ├── tests/
    │   ├── unit/
    │   │   ├── track.service.test.ts
    │   │   ├── sites.service.test.ts
    │   │   └── auth.service.test.ts
    │   ├── integration/
    │   │   └── track-to-db.test.ts    # Full flow: POST /track → SQS → worker → DB row
    │   └── load/
    │       ├── ingestion-10k.js       # k6: ramp to 10k RPS
    │       └── core-api-1k.js         # k6: analytics query load test
    │
    ├── src/
    │   │
    │   ├── shared/                    # Code used by multiple services/modules
    │   │   │
    │   │   ├── config/
    │   │   │   ├── env.ts             # Zod env validation — single source of truth
    │   │   │   ├── database.ts        # Prisma client singleton
    │   │   │   ├── redis.ts           # ioredis singleton
    │   │   │   └── sqs.ts             # SQSClient singleton (works w/ LocalStack + AWS)
    │   │   │
    │   │   ├── types/
    │   │   │   ├── event.types.ts     # TrackEvent, ParsedEvent, EventEnvelope
    │   │   │   ├── site.types.ts      # Site, CachedSite
    │   │   │   ├── auth.types.ts      # JWTPayload, AuthenticatedRequest
    │   │   │   └── index.ts
    │   │   │
    │   │   ├── middleware/
    │   │   │   ├── authenticate.ts    # JWT middleware — used by core API
    │   │   │   ├── error-handler.ts   # Global Express error handler
    │   │   │   ├── request-logger.ts  # Log every request (method, path, ms)
    │   │   │   └── cors.ts
    │   │   │
    │   │   └── utils/
    │   │       ├── logger.ts          # Winston — structured JSON logs
    │   │       ├── errors.ts          # AppError class, HTTP error helpers
    │   │       └── helpers.ts         # extractClientIp, generateId, etc.
    │   │
    │   │
    │   ├── services/
    │   │   │
    │   │   ├── core-api/              # Auth + Sites + Analytics Query API
    │   │   │   │                      # Runs on one Express server, port 3000
    │   │   │   ├── server.ts          # Express setup, mounts all core routes
    │   │   │   ├── app.ts             # app factory (for testing without starting server)
    │   │   │   │
    │   │   │   ├── modules/
    │   │   │   │   │
    │   │   │   │   ├── auth/
    │   │   │   │   │   ├── auth.routes.ts        # POST /auth/register, /login, /logout, /refresh
    │   │   │   │   │   ├── auth.controller.ts
    │   │   │   │   │   ├── auth.service.ts       # login(), register(), refreshToken()
    │   │   │   │   │   ├── auth.repository.ts    # findByEmail, createUser
    │   │   │   │   │   └── auth.types.ts         # RegisterSchema, LoginSchema (Zod)
    │   │   │   │   │
    │   │   │   │   ├── sites/
    │   │   │   │   │   ├── sites.routes.ts       # GET/POST /sites, /:id, /:id/regen-key
    │   │   │   │   │   ├── sites.controller.ts
    │   │   │   │   │   ├── sites.service.ts      # createSite, generateTrackingId, buildSnippet
    │   │   │   │   │   ├── sites.repository.ts   # findByUserId, findByTrackingId, create, update, delete
    │   │   │   │   │   └── sites.types.ts        # CreateSiteSchema, UpdateSiteSchema (Zod)
    │   │   │   │   │
    │   │   │   │   └── analytics/
    │   │   │   │       ├── analytics.routes.ts   # GET /analytics/:siteId/overview, /timeseries, /pages, /referrers, /devices, /realtime
    │   │   │   │       ├── analytics.controller.ts
    │   │   │   │       ├── analytics.service.ts  # Checks ownership, builds query params
    │   │   │   │       ├── analytics.repository.ts  # TimescaleDB queries (pg pool, not Prisma)
    │   │   │   │       ├── analytics.cache.ts    # cache-aside: Redis → DB → cache
    │   │   │   │       └── analytics.types.ts    # QueryParamsSchema, OverviewStats, etc.
    │   │   │   │
    │   │   │   └── health/
    │   │   │       └── health.routes.ts          # GET /health → DB + Redis check
    │   │   │
    │   │   │
    │   │   └── ingestion-api/         # /track endpoint — hot path, sub-5ms
    │   │       │                      # Separate Express server, port 3001
    │   │       │                      # Will be its own ECS service in AWS
    │   │       ├── server.ts          # Minimal Express setup, no unnecessary middleware
    │   │       ├── app.ts
    │   │       │
    │   │       ├── track/
    │   │       │   ├── track.routes.ts       # POST /api/v1/track
    │   │       │   ├── track.controller.ts   # validate → cache → ratelimit → enqueue → 204
    │   │       │   ├── track.service.ts      # extractClientIp, buildEnvelope, parseUrl, parseUA
    │   │       │   ├── track.repository.ts   # direct DB write (for fallback if queue is down)
    │   │       │   ├── track.cache.ts        # getCachedSite — Redis first, Prisma on miss
    │   │       │   ├── track.ratelimit.ts    # per-site + per-IP sliding window (Redis INCR)
    │   │       │   └── track.types.ts        # TrackQuerySchema (Zod) — tid, event, url, etc.
    │   │       │
    │   │       ├── queue/
    │   │       │   └── sqs.producer.ts       # publishToSqs(envelope) — fire and forget
    │   │       │
    │   │       └── health/
    │   │           └── health.routes.ts      # GET /health → Redis + SQS reachable
    │   │
    │   │
    │   └── workers/
    │       │
    │       └── event-worker/          # SQS consumer — processes events in batches
    │           │                      # Standalone Node process, its own ECS service
    │           ├── worker.ts          # Entry point — starts polling loop, handles shutdown
    │           │
    │           ├── queue/
    │           │   └── sqs.consumer.ts       # Long-poll SQS, parse messages, delete on success
    │           │
    │           ├── processors/
    │           │   ├── event.processor.ts    # Orchestrates: validate → enrich → batch → store
    │           │   ├── event.validator.ts    # Full Zod validation (not fast path — can be thorough)
    │           │   └── event.enricher.ts     # ua-parser-js, URL parsing, session logic
    │           │
    │           ├── storage/
    │           │   └── event.repository.ts   # insertManyEvents — bulk INSERT to TimescaleDB (pg pool)
    │           │
    │           ├── batching/
    │           │   └── event.batcher.ts      # Collect events → flush at N=100 OR every 1s
    │           │
    │           ├── deduplication/
    │           │   └── dedup.ts              # Redis SET of recent eventIds (bloom filter later)
    │           │
    │           ├── dlq/
    │           │   └── dlq.handler.ts        # Send poison messages to SQS DLQ with error context
    │           │
    │           └── config/
    │               └── env.ts                # Worker-specific env vars
    │
    │
    └── infrastructure/
        ├── docker-compose.yml         # Postgres + TimescaleDB, Redis, LocalStack
        └── terraform/
            ├── main.tf
            ├── variables.tf
            ├── outputs.tf
            ├── environments/
            │   ├── dev.tfvars
            │   └── prod.tfvars
            └── modules/
                ├── vpc/               # VPC, public/private subnets, NAT
                ├── rds/               # Postgres RDS (TimescaleDB)
                ├── elasticache/       # Redis
                ├── sqs/               # pulse-events queue + DLQ
                ├── ecr/               # Container registries (one per service)
                ├── ecs/               # Fargate cluster + task definitions
                ├── alb/               # Load balancer (separate for core + ingestion)
                ├── iam/               # Roles, policies
                ├── cloudwatch/        # Log groups, alarms, dashboards
                └── waf/               # Rate limiting + DDoS for ingestion ALB
