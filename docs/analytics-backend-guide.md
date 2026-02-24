# Analytics Backend - Learning Guide & Implementation Roadmap

## Project Context
You're building a Google Analytics-like system with:
- **Stack**: Node.js, Express, TypeScript, PostgreSQL (Neon), TimescaleDB, Prisma, pnpm
- **Current State**: Monolith with auth & site CRUD APIs already built
- **Goal**: Add high-performance `/track` API for event ingestion
- **Approach**: Learn and build incrementally, piece by piece

---

## 1. Backend Folder Structure

```
analytics-backend/
├── src/
│   ├── config/
│   │   ├── database.ts           # Prisma client, TimescaleDB connection
│   │   ├── redis.ts              # Redis connection config
│   │   ├── kafka.ts              # Kafka producer config (later)
│   │   └── env.ts                # Environment variables with validation
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.middleware.ts
│   │   │
│   │   ├── sites/
│   │   │   ├── sites.controller.ts
│   │   │   ├── sites.service.ts
│   │   │   ├── sites.routes.ts
│   │   │   └── sites.validation.ts
│   │   │
│   │   ├── track/                    # ← NEW: Ingestion system
│   │   │   ├── track.controller.ts   # Request handling (hot path)
│   │   │   ├── track.service.ts      # Business logic
│   │   │   ├── track.validation.ts   # Fast validation schemas
│   │   │   ├── track.routes.ts       # Route definitions
│   │   │   ├── track.cache.ts        # Redis caching logic
│   │   │   ├── track.ratelimit.ts    # Rate limiting logic
│   │   │   └── track.queue.ts        # Queue producer (later)
│   │   │
│   │   └── workers/                  # ← NEW: Background processing
│   │       ├── event-processor.ts    # Main worker logic
│   │       ├── event-enrichment.ts   # UA parsing, GeoIP, etc.
│   │       ├── event-storage.ts      # Batch DB writes
│   │       └── worker.start.ts       # Worker entry point
│   │
│   ├── shared/
│   │   ├── types/
│   │   │   ├── event.types.ts        # Event interfaces
│   │   │   ├── site.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── logger.ts             # Winston/Pino logger
│   │   │   ├── metrics.ts            # StatsD client
│   │   │   ├── errors.ts             # Custom error classes
│   │   │   └── helpers.ts            # Common utilities
│   │   │
│   │   └── middleware/
│   │       ├── error-handler.ts      # Global error handler
│   │       ├── request-logger.ts     # HTTP logging
│   │       └── cors.ts               # CORS config
│   │
│   ├── app.ts                        # Express app setup
│   ├── server.ts                     # HTTP server entry point
│   └── worker.ts                     # Worker process entry point (later)
│
├── prisma/
│   ├── schema.prisma                 # Main DB schema (users, sites)
│   └── migrations/
│
├── timescale/
│   ├── schema.sql                    # TimescaleDB schema (events)
│   └── migrations/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── load/                         # k6 or artillery tests
│
├── scripts/
│   ├── seed-data.ts
│   └── test-track.ts                 # Manual testing script
│
├── .env.example
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

### Why This Structure?

- **Modular by feature**: Each feature (auth, sites, track) is self-contained
- **Separation of concerns**: Controller → Service → Data layer
- **Shared utilities**: DRY principle for common code
- **Scalable**: Easy to extract modules into microservices later
- **Clear worker separation**: Worker code isolated from API code

---

## 2. System Design Overview

### Architecture Diagram

```
┌─────────────┐
│   Browser   │ 
│  (Frontend) │
└──────┬──────┘
       │ POST /track?tid=xxx&t=pageview&dl=...
       │
       ▼
┌─────────────────────────────────────────────┐
│         Express API (Monolith)              │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │  /track Route (Hot Path)           │    │
│  │  - Fast validation                 │    │
│  │  - Redis: Site lookup              │◄───┼── Redis Cache
│  │  - Redis: Rate limit check         │    │   (site data, 
│  │  - Build event envelope             │    │    rate limits)
│  │  - Enqueue to message queue         │    │
│  │  - Return 204 immediately           │    │
│  └────────┬───────────────────────────┘    │
│           │                                 │
│           ▼                                 │
│  ┌────────────────────────────────────┐    │
│  │  Message Queue (In-memory first)   │    │
│  │  Later: Kafka/RabbitMQ/BullMQ      │    │
│  └────────┬───────────────────────────┘    │
│           │                                 │
│           │ (async, decoupled)              │
│           ▼                                 │
│  ┌────────────────────────────────────┐    │
│  │  Worker Process (same codebase)    │    │
│  │  - Poll queue                       │    │
│  │  - Full validation                  │    │
│  │  - Enrich events                    │    │
│  │  - Batch insert to TimescaleDB      │    │
│  └────────┬───────────────────────────┘    │
└───────────┼─────────────────────────────────┘
            │
            ▼
    ┌───────────────┐      ┌──────────────────┐
    │  PostgreSQL   │      │   TimescaleDB    │
    │  (via Neon)   │      │  (events table)  │
    │               │      │                  │
    │  - users      │      │  - events (huge) │
    │  - sites      │      │  - time-series   │
    └───────────────┘      └──────────────────┘
```

### Key Design Decisions

1. **Monolith is fine for now**: Don't over-engineer. You can scale vertically and extract later if needed.

2. **Two databases**:
   - **Neon (PostgreSQL)**: User accounts, site settings, metadata (small, relational)
   - **TimescaleDB**: Event data (huge, time-series, append-only)

3. **Queue evolution**:
   - **Phase 1**: In-memory queue (just an array with setInterval)
   - **Phase 2**: BullMQ (Redis-backed, persistent)
   - **Phase 3**: Kafka (production-grade)

4. **Worker in same codebase**:
   - Start with `npm run dev:worker` (separate process, same code)
   - Later: Deploy as separate service if needed

---

## 3. Implementation Roadmap (Step-by-Step)

### Phase 0: Prerequisites ✅ (You have this already)
- [x] Auth system working
- [x] Sites CRUD working
- [x] Neon PostgreSQL connected
- [x] Prisma setup

### Phase 1: Basic Track Route (Week 1)

#### Step 1.1: Create the route skeleton
**Goal**: GET/POST to `/track` responds with 204

**Implementation**:
```typescript
// src/modules/track/track.routes.ts
import { Router } from 'express';

const router = Router();

router.post('/track', (req, res) => {
  console.log('Track request received!');
  res.status(204).send();
});

export default router;
```

**Learn**:
- Express routing basics (you likely know this)
- HTTP status codes (204 No Content)

**Test**: `curl -X POST http://localhost:3000/track`

---

#### Step 1.2: Parse query parameters
**Goal**: Extract `tid`, `t`, `dl`, etc. from query string

**Implementation**:
```typescript
router.post('/track', (req, res) => {
  const { tid, t, dl, dt } = req.query;
  
  console.log('Tracking ID:', tid);
  console.log('Event type:', t);
  console.log('Page URL:', dl);
  console.log('Page title:', dt);
  
  res.status(204).send();
});
```

**Learn**:
- Query parameters in Express (`req.query`)
- Google Analytics Measurement Protocol (see what params exist)

**Resources**:
- Search: "Google Analytics Measurement Protocol parameters"
- Docs: Express query params

**Test**: 
```bash
curl -X POST "http://localhost:3000/track?tid=UA-123&t=pageview&dl=https://example.com&dt=Home"
```

---

#### Step 1.3: Add basic validation
**Goal**: Reject requests missing required fields

**Implementation**:
```typescript
// src/modules/track/track.validation.ts
export function validateTrackParams(query: any): boolean {
  // Required fields
  if (!query.tid || typeof query.tid !== 'string') return false;
  if (!query.t || !['pageview', 'event', 'timing'].includes(query.t)) return false;
  
  // tid format check (basic)
  if (query.tid.length > 50) return false;
  
  return true;
}

// track.routes.ts
import { validateTrackParams } from './track.validation';

router.post('/track', (req, res) => {
  if (!validateTrackParams(req.query)) {
    console.log('Invalid request, dropping');
    return res.status(204).send(); // Still 204!
  }
  
  console.log('Valid request:', req.query);
  res.status(204).send();
});
```

**Learn**:
- Input validation patterns
- Why we return 204 even on invalid requests (hint: analytics should never break the page)

**Resources**:
- "Express input validation best practices"

---

#### Step 1.4: Extract metadata (IP, User-Agent)
**Goal**: Capture client IP and browser info

**Implementation**:
```typescript
// src/shared/utils/helpers.ts
export function extractClientIP(req: Request): string {
  // Check for proxy headers first
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (forwarded as string).split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// track.routes.ts
router.post('/track', (req, res) => {
  // ... validation ...
  
  const metadata = {
    ip: extractClientIP(req),
    userAgent: req.headers['user-agent'] || '',
    receivedAt: new Date().toISOString(),
  };
  
  console.log('Metadata:', metadata);
  res.status(204).send();
});
```

**Learn**:
- HTTP headers
- X-Forwarded-For (proxy/load balancer headers)
- Getting real client IP behind proxies

**Resources**:
- "Express behind proxy trust proxy"
- "X-Forwarded-For header explained"

---

### Phase 2: Database Integration (Week 1-2)

#### Step 2.1: Setup TimescaleDB schema
**Goal**: Create events table in TimescaleDB

**Implementation**:
```sql
-- timescale/schema.sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  site_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  event_type VARCHAR(20) NOT NULL,
  page_url TEXT,
  page_path TEXT,
  page_title TEXT,
  
  ip_address INET,
  user_agent TEXT,
  
  raw_params JSONB
);

-- Convert to hypertable (TimescaleDB magic)
SELECT create_hypertable('events', 'timestamp');

-- Index for fast lookups
CREATE INDEX idx_events_site_time ON events (site_id, timestamp DESC);
```

**Learn**:
- What is TimescaleDB and why use it
- Hypertables and time-series data
- When to use JSONB vs. columns

**Resources**:
- TimescaleDB docs: "Getting started with hypertables"
- "PostgreSQL JSONB vs columns performance"
- Search: "TimescaleDB tutorial Node.js"

**Setup**:
- Install TimescaleDB locally (Docker recommended) OR use Timescale Cloud free tier
- Create connection in `src/config/database.ts`

---

#### Step 2.2: Connect TimescaleDB from Node.js
**Goal**: Write first event to TimescaleDB

**Implementation**:
```typescript
// src/config/database.ts
import { Pool } from 'pg';

export const timescalePool = new Pool({
  host: process.env.TIMESCALE_HOST,
  port: parseInt(process.env.TIMESCALE_PORT || '5432'),
  database: process.env.TIMESCALE_DB,
  user: process.env.TIMESCALE_USER,
  password: process.env.TIMESCALE_PASSWORD,
  max: 20, // connection pool size
});

// src/modules/track/track.service.ts
import { timescalePool } from '@/config/database';
import { v4 as uuidv4 } from 'uuid';

export async function saveEvent(eventData: any) {
  const query = `
    INSERT INTO events (
      id, site_id, timestamp, event_type, 
      page_url, page_title, ip_address, user_agent, raw_params
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `;
  
  const values = [
    uuidv4(),
    eventData.siteId,
    eventData.timestamp,
    eventData.eventType,
    eventData.pageUrl,
    eventData.pageTitle,
    eventData.ip,
    eventData.userAgent,
    JSON.stringify(eventData.raw),
  ];
  
  await timescalePool.query(query, values);
}

// track.routes.ts
router.post('/track', async (req, res) => {
  // ... validation, metadata extraction ...
  
  await saveEvent({
    siteId: 'hardcoded-for-now', // We'll fix this next
    timestamp: new Date(),
    eventType: req.query.t,
    pageUrl: req.query.dl,
    pageTitle: req.query.dt,
    ip: metadata.ip,
    userAgent: metadata.userAgent,
    raw: req.query,
  });
  
  res.status(204).send();
});
```

**Learn**:
- pg (node-postgres) library
- Connection pooling
- Parameterized queries (SQL injection prevention)
- UUIDs vs auto-increment IDs

**Resources**:
- "node-postgres tutorial"
- "PostgreSQL connection pooling explained"
- npm package: `pg`

**Test**: Check if event appears in TimescaleDB:
```sql
SELECT * FROM events ORDER BY timestamp DESC LIMIT 10;
```

---

#### Step 2.3: Validate tracking ID against sites table
**Goal**: Look up site by tracking_id, reject if not found

**Implementation**:
```typescript
// Using your existing Prisma setup
// src/modules/track/track.service.ts
import { prisma } from '@/config/database'; // Your existing Prisma client

export async function getSiteByTrackingId(trackingId: string) {
  const site = await prisma.site.findUnique({
    where: { trackingId },
    select: {
      id: true,
      isActive: true,
      userId: true,
    },
  });
  
  return site;
}

// track.routes.ts
router.post('/track', async (req, res) => {
  // ... validation ...
  
  const site = await getSiteByTrackingId(req.query.tid as string);
  
  if (!site || !site.isActive) {
    console.log('Site not found or inactive, dropping event');
    return res.status(204).send();
  }
  
  await saveEvent({
    siteId: site.id, // Now we have the real site ID!
    // ... rest
  });
  
  res.status(204).send();
});
```

**Learn**:
- Prisma queries (you likely know this)
- Database lookups in request handlers

**Test**: 
- Create a site via your existing CRUD API
- Use its tracking_id in track request
- Verify event saved with correct site_id

---

### Phase 3: Caching with Redis (Week 2)

#### Step 3.1: Setup Redis connection
**Goal**: Connect to Redis, test basic get/set

**Implementation**:
```typescript
// src/config/redis.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => console.log('✓ Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err));

// Test it
export async function testRedis() {
  await redis.set('test', 'hello');
  const value = await redis.get('test');
  console.log('Redis test:', value); // Should print "hello"
}
```

**Learn**:
- What is Redis and why use it
- Redis data types (strings, hashes, sets)
- Connection options and retry logic

**Resources**:
- "Redis crash course" (YouTube, ~20min video)
- ioredis npm package docs
- "Redis use cases for web applications"

**Setup**:
- Install Redis locally: `brew install redis` (Mac) or Docker
- Or use Redis Cloud free tier
- Install: `pnpm add ioredis`

**Test**: Call `testRedis()` from `server.ts` on startup

---

#### Step 3.2: Cache site lookups
**Goal**: Check Redis before querying database

**Implementation**:
```typescript
// src/modules/track/track.cache.ts
import { redis } from '@/config/redis';
import { getSiteByTrackingId } from './track.service';

const CACHE_TTL = 300; // 5 minutes

export async function getCachedSite(trackingId: string) {
  // Try cache first
  const cacheKey = `site:${trackingId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    console.log('Cache HIT for', trackingId);
    return JSON.parse(cached);
  }
  
  console.log('Cache MISS for', trackingId);
  
  // Cache miss - query database
  const site = await getSiteByTrackingId(trackingId);
  
  if (site) {
    // Store in cache for 5 minutes
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(site));
  }
  
  return site;
}

// track.routes.ts - replace getSiteByTrackingId with getCachedSite
const site = await getCachedSite(req.query.tid as string);
```

**Learn**:
- Cache-aside pattern
- TTL (Time To Live)
- When to invalidate cache
- Cache key naming conventions

**Resources**:
- "Cache-aside pattern explained"
- "Redis caching best practices"

**Test**: 
- Make same track request twice
- First should log "Cache MISS"
- Second should log "Cache HIT"
- Measure response time difference

---

#### Step 3.3: Add simple rate limiting
**Goal**: Prevent abuse, limit events per site per minute

**Implementation**:
```typescript
// src/modules/track/track.ratelimit.ts
import { redis } from '@/config/redis';

const RATE_LIMITS = {
  free: 1000,      // 1k events/minute
  pro: 10000,      // 10k events/minute
};

export async function checkRateLimit(
  siteId: string, 
  tier: 'free' | 'pro' = 'free'
): Promise<boolean> {
  const limit = RATE_LIMITS[tier];
  const currentMinute = Math.floor(Date.now() / 60000);
  const key = `ratelimit:${siteId}:${currentMinute}`;
  
  // Increment counter
  const count = await redis.incr(key);
  
  // Set expiry on first increment (2 minutes to be safe)
  if (count === 1) {
    await redis.expire(key, 120);
  }
  
  // Check if exceeded
  if (count > limit) {
    console.log(`Rate limit exceeded for site ${siteId}: ${count}/${limit}`);
    return false; // Reject
  }
  
  return true; // Allow
}

// track.routes.ts
const allowed = await checkRateLimit(site.id, 'free');
if (!allowed) {
  console.log('Rate limited, dropping event');
  return res.status(204).send();
}
```

**Learn**:
- Rate limiting algorithms (sliding window, token bucket)
- Redis INCR command
- Redis EXPIRE command

**Resources**:
- "Rate limiting algorithms explained"
- "Redis INCR atomic operations"
- "Implementing rate limiting with Redis"

**Test**:
- Write a script that sends 1001 requests in 1 minute
- 1000 should succeed, 1+ should be rate limited

---

### Phase 4: Async Processing with Queue (Week 3)

#### Step 4.1: In-memory queue (simplest start)
**Goal**: Don't block response, process events asynchronously

**Implementation**:
```typescript
// src/modules/track/track.queue.ts
type EventEnvelope = {
  id: string;
  siteId: string;
  receivedAt: Date;
  ip: string;
  userAgent: string;
  raw: any;
};

// Simple in-memory queue (just an array!)
const eventQueue: EventEnvelope[] = [];

export function enqueueEvent(envelope: EventEnvelope) {
  eventQueue.push(envelope);
  console.log(`Enqueued event, queue size: ${eventQueue.length}`);
}

export function dequeueEvents(batchSize: number = 100): EventEnvelope[] {
  return eventQueue.splice(0, batchSize);
}

// Start a background processor
export function startQueueProcessor() {
  setInterval(async () => {
    const batch = dequeueEvents(100);
    
    if (batch.length === 0) return;
    
    console.log(`Processing batch of ${batch.length} events`);
    
    // Process each event (save to DB)
    for (const event of batch) {
      try {
        await saveEvent({
          siteId: event.siteId,
          timestamp: event.receivedAt,
          eventType: event.raw.t,
          pageUrl: event.raw.dl,
          pageTitle: event.raw.dt,
          ip: event.ip,
          userAgent: event.userAgent,
          raw: event.raw,
        });
      } catch (err) {
        console.error('Failed to save event:', err);
        // In production: send to DLQ
      }
    }
    
    console.log(`Batch processed successfully`);
  }, 1000); // Every 1 second
}

// track.routes.ts - MAJOR CHANGE!
router.post('/track', async (req, res) => {
  // ... validation, cache, rate limit ...
  
  // Don't await DB write!
  enqueueEvent({
    id: uuidv4(),
    siteId: site.id,
    receivedAt: new Date(),
    ip: metadata.ip,
    userAgent: metadata.userAgent,
    raw: req.query,
  });
  
  // Return immediately!
  res.status(204).send();
});

// server.ts - start processor
import { startQueueProcessor } from '@/modules/track/track.queue';

// After app.listen()
startQueueProcessor();
console.log('✓ Queue processor started');
```

**Learn**:
- Event-driven architecture
- Async vs sync processing
- Queue data structures
- setInterval for background jobs

**Resources**:
- "Event-driven architecture explained"
- "Queue data structure JavaScript"
- "Node.js setInterval background tasks"

**Test**:
- Send 10 track requests rapidly
- Response should be instant (<5ms)
- Events should appear in DB within 1-2 seconds
- Log should show batch processing

---

#### Step 4.2: Upgrade to BullMQ (Redis-backed queue)
**Goal**: Persist queue, survive restarts, better monitoring

**Implementation**:
```typescript
// Install: pnpm add bullmq

// src/modules/track/track.queue.ts
import { Queue, Worker } from 'bullmq';
import { redis } from '@/config/redis';

const eventQueue = new Queue('events', {
  connection: redis,
});

export async function enqueueEvent(envelope: EventEnvelope) {
  await eventQueue.add('track-event', envelope, {
    removeOnComplete: 1000, // Keep last 1000 for debugging
    removeOnFail: 5000,
  });
}

// Worker (can be in same process or separate)
export function startQueueWorker() {
  const worker = new Worker(
    'events',
    async (job) => {
      const event = job.data;
      
      // Process the event
      await saveEvent({
        siteId: event.siteId,
        // ... etc
      });
    },
    {
      connection: redis,
      concurrency: 10, // Process 10 jobs in parallel
    }
  );
  
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });
  
  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });
  
  return worker;
}

// server.ts
import { startQueueWorker } from '@/modules/track/track.queue';
startQueueWorker();
```

**Learn**:
- Message queues vs in-memory queues
- BullMQ concepts (jobs, workers, queues)
- Job retries and failure handling
- Worker concurrency

**Resources**:
- BullMQ documentation (excellent!)
- "Introduction to message queues"
- "BullMQ vs Bull vs other queues" (comparison)

**Test**:
- Restart server while events are queued
- Events should still be processed after restart
- Check BullMQ dashboard (optional: bull-board package)

---

### Phase 5: Optimization & Production Prep (Week 4)

#### Step 5.1: Batch database inserts
**Goal**: Instead of 1 insert per event, batch 100 at once

**Implementation**:
```typescript
// src/modules/track/track.service.ts
export async function saveBatchEvents(events: EventEnvelope[]) {
  if (events.length === 0) return;
  
  // Build multi-row INSERT
  const values = events.map((e, idx) => {
    const offset = idx * 9;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
  }).join(', ');
  
  const query = `
    INSERT INTO events (
      id, site_id, timestamp, event_type, page_url, 
      page_title, ip_address, user_agent, raw_params
    ) VALUES ${values}
  `;
  
  const params = events.flatMap(e => [
    uuidv4(),
    e.siteId,
    e.receivedAt,
    e.raw.t,
    e.raw.dl,
    e.raw.dt,
    e.ip,
    e.userAgent,
    JSON.stringify(e.raw),
  ]);
  
  await timescalePool.query(query, params);
  console.log(`Batch inserted ${events.length} events`);
}

// Update worker to batch
const worker = new Worker(
  'events',
  async (job) => {
    // BullMQ processes one job at a time, so we need to batch differently
    // Either: collect jobs into batches, or use job.waitUntil
    
    await saveEvent(job.data); // For now, keep it simple
  },
  {
    concurrency: 50, // High concurrency = more parallel inserts
  }
);
```

**Learn**:
- Batch inserts in PostgreSQL
- Multi-value INSERT syntax
- Performance: 1000 single inserts vs 10 batch inserts of 100

**Resources**:
- "PostgreSQL batch insert performance"
- "Building dynamic SQL queries safely"

**Test**:
- Send 1000 events
- Measure time: single inserts vs batch inserts
- Should be 5-10x faster

---

#### Step 5.2: Add metrics and monitoring
**Goal**: Track request latency, queue depth, errors

**Implementation**:
```typescript
// Install: pnpm add prom-client

// src/shared/utils/metrics.ts
import client from 'prom-client';

// Create metrics
export const trackRequestDuration = new client.Histogram({
  name: 'track_request_duration_ms',
  help: 'Track request duration in milliseconds',
  buckets: [1, 2, 5, 10, 25, 50, 100, 250, 500],
});

export const trackRequestsTotal = new client.Counter({
  name: 'track_requests_total',
  help: 'Total track requests',
  labelNames: ['status'],
});

export const queueDepth = new client.Gauge({
  name: 'event_queue_depth',
  help: 'Number of events in queue',
});

// Expose metrics endpoint
export function setupMetrics(app: Express) {
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });
}

// track.routes.ts - instrument the route
router.post('/track', async (req, res) => {
  const start = Date.now();
  
  try {
    // ... all your logic ...
    
    const duration = Date.now() - start;
    trackRequestDuration.observe(duration);
    trackRequestsTotal.inc({ status: 'success' });
    
    res.status(204).send();
  } catch (err) {
    trackRequestsTotal.inc({ status: 'error' });
    throw err;
  }
});
```

**Learn**:
- What is Prometheus
- Metrics types: Counter, Gauge, Histogram
- How to visualize metrics (Grafana)

**Resources**:
- "Prometheus metrics types explained"
- "prom-client npm package tutorial"
- "Grafana Cloud free tier" (optional: for visualization)

**Test**:
- Visit http://localhost:3000/metrics
- Should see your metrics
- Send some requests, metrics should update

---

#### Step 5.3: Error handling and logging
**Goal**: Proper error handling, structured logging

**Implementation**:
```typescript
// Install: pnpm add pino pino-pretty

// src/shared/utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// src/shared/middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '@/shared/utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      headers: req.headers,
    },
  }, 'Request error');
  
  // For /track, always return 204 (never break the page!)
  if (req.path === '/track') {
    return res.status(204).send();
  }
  
  // For other routes, return proper error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

// app.ts - add error handler (must be last!)
app.use(errorHandler);

// Update all console.log to use logger
logger.info('Server started');
logger.error('Redis connection failed', err);
```

**Learn**:
- Structured logging
- Log levels (debug, info, warn, error)
- Error handling middleware in Express

**Resources**:
- "Pino logger tutorial Node.js"
- "Express error handling best practices"

---

#### Step 5.4: Environment configuration
**Goal**: Proper env var management, validation

**Implementation**:
```typescript
// Install: pnpm add dotenv zod

// src/config/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().default('3000'),
  
  // Database
  DATABASE_URL: z.string().url(),
  TIMESCALE_HOST: z.string(),
  TIMESCALE_PORT: z.string(),
  TIMESCALE_DB: z.string(),
  TIMESCALE_USER: z.string(),
  TIMESCALE_PASSWORD: z.string(),
  
  // Redis
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string(),
  REDIS_PASSWORD: z.string().optional(),
  
  // Optional
  LOG_LEVEL: z.string().default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

// Usage elsewhere:
// import { env } from '@/config/env';
// const port = env.PORT;
```

**Learn**:
- Environment variables
- dotenv package
- Runtime validation with Zod

**Resources**:
- "dotenv npm package"
- "Environment variables best practices Node.js"

---

### Phase 6: Load Testing & Optimization (Week 4-5)

#### Step 6.1: Load testing with k6
**Goal**: Test if you can handle 1k RPS (start small!)

**Implementation**:
```javascript
// tests/load/track-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp up to 100 RPS
    { duration: '1m', target: 100 },    // Stay at 100 RPS
    { duration: '30s', target: 500 },   // Ramp to 500 RPS
    { duration: '1m', target: 500 },    // Stay at 500 RPS
    { duration: '30s', target: 0 },     // Ramp down
  ],
};

export default function () {
  const url = 'http://localhost:3000/track';
  const params = {
    tid: 'UA-TEST-123',
    t: 'pageview',
    dl: 'https://example.com/page',
    dt: 'Test Page',
    z: Math.random(), // Cache buster
  };
  
  const res = http.post(`${url}?${new URLSearchParams(params)}`);
  
  check(res, {
    'status is 204': (r) => r.status === 204,
    'response time < 5ms': (r) => r.timings.duration < 5,
  });
  
  sleep(0.01); // Small delay between requests
}
```

**Run**: `k6 run tests/load/track-load-test.js`

**Learn**:
- Load testing concepts (RPS, latency, percentiles)
- k6 scripting
- How to interpret load test results

**Resources**:
- k6 docs: "Getting started"
- "Load testing best practices"
- "Understanding p50, p95, p99 latency"

**What to look for**:
- p95 latency < 5ms ✅
- No errors ✅
- Queue depth stable ✅
- Database connections stable ✅

---

#### Step 6.2: Identify bottlenecks
**Goal**: Find what's slow, optimize it

**Common bottlenecks**:
1. **Database lookups**: Cache more aggressively
2. **Redis connection**: Use connection pooling
3. **JSON stringify**: Pre-compute where possible
4. **Logging**: Disable in hot path
5. **Validation**: Optimize validation logic

**Tools**:
- `clinic.js` - Node.js performance profiling
- `0x` - Flamegraphs for Node.js
- `autocannon` - Quick HTTP benchmarking

**Learn**:
- Node.js profiling
- Event loop lag
- Memory leaks

**Resources**:
- "Node.js performance optimization"
- "clinic.js tutorial"
- Search: "Node.js flame graphs"

---

### Phase 7: Advanced Features (Week 5+)

Now you're ready for:
- Session stitching
- User-Agent parsing
- GeoIP lookup
- Event enrichment
- Real-time dashboards
- Data aggregation
- Export features

---

## 4. Learning Resources (Curated)

### Core Concepts (Must Learn)

1. **HTTP & REST APIs**
   - You know this already ✅

2. **Caching**
   - Article: "Caching Strategies and How to Choose the Right One" (freeCodeCamp)
   - Video: "Caching - Simply Explained" (YouTube)

3. **Message Queues**
   - Article: "What is a Message Queue?" (AWS)
   - Video: "Message Queues Explained" (ByteByteGo)
   - Docs: BullMQ documentation

4. **Time-Series Databases**
   - Docs: TimescaleDB getting started
   - Article: "Time-Series Database Explained"

5. **Performance Optimization**
   - Book: "Node.js Design Patterns" (Chapter on Performance)
   - Video: "Node.js Performance Tips" (JavaScript Mastery)

### Tools & Libraries

1. **Redis**
   - Tutorial: Redis University (free course)
   - Cheatsheet: "Redis commands cheatsheet"

2. **Load Testing**
   - k6 documentation
   - Article: "Load Testing Best Practices"

3. **Monitoring**
   - prom-client npm docs
   - Article: "Monitoring Node.js Applications"

### Reference Projects

1. **Plausible Analytics** (open-source, similar to what you're building)
   - GitHub: plausible/analytics (Elixir, but good for concepts)

2. **Umami** (open-source analytics in Node.js)
   - GitHub: umami-software/umami

---

## 5. Development Flow Summary

### Typical Day of Development

```
1. Pick next step from roadmap
2. Research topic (10-30 min) - watch a video, read docs
3. Implement in small chunks
   - Write code
   - Test manually
   - Check logs
4. Commit when it works
5. Move to next step

Repeat!
```

### Testing as You Go

```bash
# Manual testing
curl -X POST "http://localhost:3000/track?tid=UA-123&t=pageview&dl=https://example.com"

# Check logs
tail -f logs/app.log

# Check database
psql -d analytics -c "SELECT * FROM events ORDER BY timestamp DESC LIMIT 5"

# Check Redis
redis-cli
> GET site:UA-123
> KEYS ratelimit:*

# Check queue
# (depends on queue system - BullMQ has a dashboard)
```

### When You're Stuck

1. Check error messages carefully
2. Add more logging
3. Search error on Google/StackOverflow
4. Read the library docs
5. Ask on Discord/Reddit (Node.js, webdev communities)
6. Simplify - remove code until it works, add back piece by piece

---

## 6. Final Tips

1. **Commit often**: After each working step
2. **Test locally first**: Don't deploy broken code
3. **Monitor from day 1**: Add metrics early
4. **Document as you go**: README, inline comments
5. **Don't over-optimize early**: Get it working, then make it fast
6. **Celebrate small wins**: Each step is progress!

---

## Summary

You're building this in a logical, human flow:

1. ✅ Auth & Sites (done)
2. → Basic track route (console.log)
3. → Parse query params
4. → Validate inputs
5. → Save to database
6. → Look up site by tracking ID
7. → Add caching
8. → Add rate limiting
9. → Make it async (queue)
10. → Batch processing
11. → Metrics & monitoring
12. → Load testing
13. → Optimize bottlenecks
14. → Advanced features

Each step builds on the last. You'll learn the concepts just-in-time as you need them. No need to master Redis before using it - just learn enough to implement caching, then learn more as needed.

Good luck! 🚀
