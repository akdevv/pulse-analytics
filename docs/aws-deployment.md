# AWS Deployment Guide — Pulse Analytics Backend

No Terraform. AWS Console + GitHub Actions only.

---

## Architecture Overview

```
Internet
   │
   ▼
ALB (HTTPS, port 443)
   │
   ├──▶ ECS Fargate — API service (port 8000)
   │
   └──▶ ECS Fargate — Worker service
              │
              ├──▶ Timescale Cloud (PostgreSQL + TimescaleDB)
              └──▶ ElastiCache Redis
```

---

## AWS Services Used

| Service | Purpose | Recommended Size |
|---------|---------|-----------------|
| **ECS Fargate** | Run API + Worker containers | 0.5 vCPU / 1GB RAM each (scale up as needed) |
| **ECR** | Store Docker images | — |
| **ALB** | HTTPS load balancer | — |
| **ElastiCache (Redis)** | Queue, cache, rate limiting | `cache.t3.micro` (start), `cache.t3.small` (production) |
| **ACM** | SSL certificate | Free |
| **Secrets Manager** | Store env vars and secrets | — |
| **VPC** | Network isolation | Default VPC is fine to start |
| **Timescale Cloud** | Managed TimescaleDB | `Basic-8` plan to start |

> **Why not RDS?** AWS RDS does not support the TimescaleDB extension. Your migrations use TimescaleDB-specific features (hypertables, continuous aggregates, compression). Use **Timescale Cloud** — it's a managed TimescaleDB service with a free trial.

---

## Step 1 — Prerequisites

- AWS account with admin access
- AWS CLI installed and configured (`aws configure`)
- Docker installed locally
- GitHub repository with your backend code

```bash
# Verify AWS CLI works
aws sts get-caller-identity
```

---

## Step 2 — Create ECR Repository

ECR is where your Docker images live.

1. Go to **AWS Console → ECR → Create repository**
2. Name: `pulse-analytics-backend`
3. Visibility: **Private**
4. Click **Create repository**

Note the repository URI — looks like:
```
123456789.dkr.ecr.ap-south-1.amazonaws.com/pulse-analytics-backend
```

---

## Step 3 — Set Up Timescale Cloud (Database)

1. Go to [timescale.com](https://timescale.com) → Create account
2. Create a new service:
   - **Type**: Time-series (TimescaleDB)
   - **Region**: Same as your AWS region (e.g., `ap-south-1`)
   - **Plan**: Basic-8 (2 vCPU, 8GB RAM) — scale down to Basic-2 for early stage
3. After creation, copy the connection string:
   ```
   postgres://user:password@host.tsdb.cloud:5432/tsdb
   ```
4. Run your migrations against it:
   ```bash
   DATABASE_URL="your-connection-string" pnpm exec prisma migrate deploy
   DATABASE_URL="your-connection-string" pnpm db:migrate
   ```

---

## Step 4 — Create ElastiCache Redis

1. Go to **AWS Console → ElastiCache → Create cluster**
2. Choose **Redis OSS**
3. Configuration:
   - **Cluster mode**: Disabled (simpler, fine for most loads)
   - **Node type**: `cache.t3.micro` (upgrade to `cache.t3.small` when needed)
   - **Number of replicas**: 1 (for failover)
   - **Subnet group**: Create new, select your VPC subnets
4. **Security group**: Create one called `pulse-redis-sg`
   - Inbound: port `6379` from your ECS security group (add this after ECS is set up)
5. After creation, copy the **Primary Endpoint** — looks like:
   ```
   pulse-redis.xxxxx.0001.apse1.cache.amazonaws.com
   ```

---

## Step 5 — Store Secrets in AWS Secrets Manager

Never put secrets in environment variables directly in ECS task definitions.

1. Go to **AWS Console → Secrets Manager → Store a new secret**
2. Choose **Other type of secret**
3. Add these key/value pairs:

```
ACCESS_TOKEN_SECRET       = <strong-random-string>
REFRESH_TOKEN_SECRET      = <strong-random-string>
DATABASE_URL              = <timescale-connection-string>
REDIS_HOST                = <elasticache-primary-endpoint>
FRONTEND_URL              = https://your-frontend-domain.com
TRACKING_SCRIPT_URL       = https://your-api-domain.com
```

4. Name the secret: `pulse-analytics/backend/production`
5. Note the **Secret ARN** — you'll need it for ECS task definitions

---

## Step 6 — Create ECS Cluster

1. Go to **AWS Console → ECS → Clusters → Create cluster**
2. Choose **AWS Fargate (serverless)**
3. Name: `pulse-analytics`
4. Click **Create**

---

## Step 7 — Create Task Definitions

You need two task definitions — one for the API, one for the Worker.

### 7a — API Task Definition

1. Go to **ECS → Task Definitions → Create new task definition**
2. **Launch type**: Fargate
3. **Task definition name**: `pulse-api`
4. **Task size**:
   - CPU: `0.5 vCPU`
   - Memory: `1 GB`
5. **Task role**: Create a new IAM role with `SecretsManagerReadWrite` permission
6. **Container**:
   - Name: `api`
   - Image: `<your-ecr-uri>:latest`
   - Port mapping: `8000`
   - Command: `node, --import, tsx, src/index.ts`
   - **Environment variables** — pull from Secrets Manager:
     - `NODE_ENV` = `production` (plain value)
     - `PORT` = `8000` (plain value)
     - `ACCESS_TOKEN_SECRET` → from Secrets Manager ARN
     - `REFRESH_TOKEN_SECRET` → from Secrets Manager ARN
     - `DATABASE_URL` → from Secrets Manager ARN
     - `REDIS_HOST` → from Secrets Manager ARN
     - `REDIS_PORT` = `6379` (plain value)
     - `FRONTEND_URL` → from Secrets Manager ARN
     - `TRACKING_SCRIPT_URL` → from Secrets Manager ARN
   - **Health check**: `CMD-SHELL, wget -qO- http://localhost:8000/api/v1/health || exit 1`
   - **Log configuration**: `awslogs`, log group `/ecs/pulse-api`

### 7b — Worker Task Definition

Same as above but:
- Name: `pulse-worker`
- No port mapping needed
- Command: `node, --import, tsx, src/worker.ts`
- No health check needed (BullMQ worker is stateless)

---

## Step 8 — Set Up Application Load Balancer

1. Go to **EC2 → Load Balancers → Create Load Balancer**
2. Choose **Application Load Balancer**
3. Name: `pulse-alb`
4. Scheme: **Internet-facing**
5. Listeners:
   - HTTP (80) → redirect to HTTPS
   - HTTPS (443) → forward to target group
6. **Target group**:
   - Type: IP
   - Name: `pulse-api-tg`
   - Port: `8000`
   - Health check path: `/api/v1/health`

### SSL Certificate (ACM)

1. Go to **ACM → Request certificate**
2. Enter your domain: `api.yourdomain.com`
3. Validate via DNS (add the CNAME to your DNS provider)
4. Attach the certificate to your ALB HTTPS listener

---

## Step 9 — Create ECS Services

### 9a — API Service

1. Go to **ECS → Cluster → pulse-analytics → Create service**
2. **Launch type**: Fargate
3. **Task definition**: `pulse-api`
4. **Service name**: `pulse-api-service`
5. **Desired tasks**: `1` (increase to `2` for high availability)
6. **Load balancing**: Attach to the ALB target group you created
7. **Security group**: Create `pulse-api-sg`
   - Inbound: port `8000` from ALB security group
   - Outbound: all traffic
8. Click **Create service**

### 9b — Worker Service

1. Same steps, use task definition `pulse-worker`
2. **Service name**: `pulse-worker-service`
3. **Desired tasks**: `1`
4. No load balancer needed
5. Same security group as API (needs Redis + DB access)

### Update Redis Security Group

Go back to `pulse-redis-sg` and add inbound rule:
- Port: `6379`
- Source: `pulse-api-sg`

---

## Step 10 — GeoIP Database

The worker needs the MaxMind GeoLite2 database. Options:

**Option A (recommended): Download in Dockerfile**
```dockerfile
# Add to Dockerfile before CMD
RUN mkdir -p /app/data
# Download during build or mount via EFS
```

**Option B: Store in S3, download on startup**

Add to the beginning of `src/worker.ts`:
```typescript
// Download GeoIP DB from S3 if not present
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
```

For now, the simplest approach is to include the `.mmdb` file in the Docker image during the CI/CD build step (download it in GitHub Actions before building).

---

## Step 11 — CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AWS_REGION: ap-south-1
  ECR_REPOSITORY: pulse-analytics-backend
  ECS_CLUSTER: pulse-analytics
  API_SERVICE: pulse-api-service
  WORKER_SERVICE: pulse-worker-service
  API_TASK_DEF: pulse-api
  WORKER_TASK_DEF: pulse-worker

jobs:
  test:
    name: Test & Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: backend/pnpm-lock.yaml

      - name: Install dependencies
        working-directory: backend
        run: pnpm install --frozen-lockfile

      - name: Type check
        working-directory: backend
        run: pnpm typecheck

      - name: Lint
        working-directory: backend
        run: pnpm lint

      - name: Run tests
        working-directory: backend
        run: pnpm test
        # Remove the line above if tests don't exist yet

  deploy:
    name: Build & Deploy
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Download GeoIP database
        working-directory: backend
        run: |
          mkdir -p data
          curl -L "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${{ secrets.MAXMIND_LICENSE_KEY }}&suffix=tar.gz" \
            | tar -xz --strip-components=1 -C data/ --wildcards "*.mmdb"

      - name: Build and push Docker image
        id: build-image
        working-directory: backend
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Deploy API to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: ${{ env.API_TASK_DEF }}
          service: ${{ env.API_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          image: ${{ steps.build-image.outputs.image }}
          container-name: api
          wait-for-service-stability: true

      - name: Deploy Worker to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: ${{ env.WORKER_TASK_DEF }}
          service: ${{ env.WORKER_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          image: ${{ steps.build-image.outputs.image }}
          container-name: worker
          wait-for-service-stability: true
```

### GitHub Secrets to Add

Go to **GitHub → Repository → Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | IAM user access key (deploy-only permissions) |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `MAXMIND_LICENSE_KEY` | MaxMind account license key (free) |

### IAM User for GitHub Actions

Create a dedicated IAM user (`github-actions-deploy`) with only what it needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:RegisterTaskDefinition",
        "ecs:DescribeTaskDefinition"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "<your-ecs-task-execution-role-arn>"
    }
  ]
}
```

---

## Step 12 — DNS Setup

1. Go to your domain registrar (or Route 53)
2. Add an **A record** (alias):
   - Name: `api`
   - Value: ALB DNS name (e.g., `pulse-alb-123456.ap-south-1.elb.amazonaws.com`)
3. Your API is now live at `https://api.yourdomain.com`

---

## Deployment Flow Summary

```
Push to main
     │
     ▼
GitHub Actions
     │
     ├── pnpm typecheck
     ├── pnpm lint
     ├── pnpm test
     │
     ├── Download GeoIP DB
     ├── docker build
     ├── docker push → ECR
     │
     ├── ECS deploy API service   (zero-downtime rolling deploy)
     └── ECS deploy Worker service
```

---

## First Deploy Checklist

- [ ] ECR repository created
- [ ] Timescale Cloud DB provisioned and migrations run
- [ ] ElastiCache Redis cluster running
- [ ] Secrets stored in AWS Secrets Manager
- [ ] ECS cluster created
- [ ] Task definitions created (API + Worker)
- [ ] ALB created with HTTPS listener
- [ ] SSL certificate issued and attached
- [ ] ECS services created and running
- [ ] DNS record pointing to ALB
- [ ] GitHub secrets added
- [ ] Push to main → pipeline runs green
- [ ] `GET https://api.yourdomain.com/api/v1/health` returns `200 ok`

---

## Estimated Monthly Cost (Early Stage)

| Service | Cost |
|---------|------|
| ECS Fargate (API + Worker, 0.5 vCPU / 1GB each) | ~$15–20 |
| ElastiCache `cache.t3.micro` | ~$15 |
| ALB | ~$20 |
| ECR storage | ~$1 |
| Timescale Cloud Basic-2 | ~$29 |
| **Total** | **~$80–85/month** |

Scale up Fargate task size and Timescale plan as traffic grows.
