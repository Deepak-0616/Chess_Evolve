# Chess Evolve - Enterprise Production Deployment Guide

This guide describes the complete end-to-end production deployment, configuration, monitoring, rollback, and disaster recovery processes for Chess Evolve AI.

---

## 1. Architecture Topology

```
[ Internet Users ]
       │
[ CDN / Cloudflare ]
       ├─────────────────────────────────┐
       ▼                                 ▼
[ Frontend Web Host ]          [ Production Express API ]
(Vercel / S3 + CloudFront)               │
                                         ├────────────────────────┐
                                         ▼                        ▼
                               [ Supabase PostgreSQL ]    [ Redis 7 Cluster ]
                               (With RLS & Auth)          (BullMQ Queues)
                                         ▲                        ▲
                                         │                        │
                                         ▼                        ▼
                               [ ML PyTorch Service ] ◄── [ BullMQ Workers ]
                               (Port 8000)
                                         │
                                         ▼
                               [ Stockfish Engine ]
```

---

## 2. Infrastructure Setup & Environment Configuration

### 2.1 Supabase Production Setup
1. Create a production Supabase project at [https://supabase.com](https://supabase.com).
2. Retrieve connection strings from `Project Settings -> Database`:
   - Connection Pooling URL (Transaction Mode / PgBouncer, Port 6543) -> `DATABASE_URL`
   - Direct PostgreSQL URL (Session Mode, Port 5432) -> `DIRECT_DATABASE_URL`
3. Retrieve API keys from `Project Settings -> API`:
   - Project URL -> `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - Anon Public Key -> `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
   - Service Role Secret -> `SUPABASE_SERVICE_ROLE_KEY` *(Never expose to client)*

### 2.2 Database Migration Execution
Apply production database migrations using Prisma migration deploy:
```bash
cd backend
# Verify connection
npx prisma migrate status --schema=../prisma/schema.prisma

# Deploy migrations idempotently
npm run prisma:migrate:deploy
```

### 2.3 Google OAuth Configuration

#### Step 1: Google Cloud Console Configuration
1. Open [Google Cloud Console -> APIs & Services -> Credentials](https://console.cloud.google.com/apis/credentials).
2. Configure **OAuth Consent Screen**:
   - User Type: **External**
   - App Name: `Chess Evolve`
   - User support email & Developer contact email.
   - Scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`.
3. Create **OAuth 2.0 Client ID**:
   - Application Type: **Web Application**
   - Name: `Chess Evolve Web Client`
   - **Authorized JavaScript origins**:
     - Development: `http://localhost:3000`
     - Production: `https://app.chessevolve.com` (or your production domain)
   - **Authorized redirect URIs** (Must use your Supabase Auth callback):
     - `https://jflaxfptqwnqxshzevqa.supabase.co/auth/v1/callback`
4. Copy the generated **Client ID** and **Client Secret**.

#### Step 2: Supabase Dashboard Configuration
1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/jflaxfptqwnqxshzevqa) -> **Authentication** -> **Providers** -> **Google**.
2. Toggle **Enable Sign in with Google** to ON.
3. Paste:
   - **Client ID**: `<Your-Google-Client-ID>`
   - **Client Secret**: `<Your-Google-Client-Secret>`
4. Save Changes.

#### Step 3: Supabase URL Configuration
1. Navigate to **Authentication** -> **URL Configuration**:
   - **Site URL**: `http://localhost:3000` (for local dev) or `https://app.chessevolve.com` (for production).
   - **Redirect URLs**:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/**`
     - `https://app.chessevolve.com/auth/callback`
     - `https://app.chessevolve.com/**`
2. Save changes.

---

## 3. Microservice Deployments

### 3.1 Redis Cluster Setup
- Provision a managed Redis 7 instance (Upstash, AWS ElastiCache, or Redis Cloud).
- Enable TLS and persistence (`AOF: everysec`).
- Configure `REDIS_URL=rediss://default:<PASSWORD>@<HOST>:<PORT>`.

### 3.2 ML Service Deployment (FastAPI + PyTorch)
- Build container image:
  ```bash
  cd ml-service
  docker build -t chess-evolve-ml:latest .
  ```
- Deploy to container orchestrator (AWS ECS, GCP Cloud Run, or Kubernetes).
- Set required environment variables:
  - `PORT=8000`
  - `DIRECT_DATABASE_URL`
  - `STOCKFISH_PATH=/usr/games/stockfish`
  - `MODEL_STORAGE_PATH=/app/artifacts`
  - `REDIS_URL`
- Configure persistent volume mount for `/app/artifacts` if using local disk mode, or link S3/Supabase Storage.
- Health Check: `GET /health` (Port 8000)
- Readiness Check: `GET /ready` (Port 8000)

### 3.3 Backend Deployment (Node.js Express API)
- Build container image:
  ```bash
  cd backend
  docker build -t chess-evolve-backend:latest .
  ```
- Set required environment variables:
  - `PORT=5000`
  - `NODE_ENV=production`
  - `DATABASE_URL`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `REDIS_URL`
  - `ML_SERVICE_URL=http://ml-service.internal:8000`
  - `CORS_ORIGINS=https://app.chessevolve.com`
  - `STOCKFISH_PATH=/usr/bin/stockfish`
- Health Check: `GET /health`
- Readiness Check: `GET /ready`

### 3.4 Worker Daemon Deployment (BullMQ Worker)
- Build container image:
  ```bash
  cd backend
  docker build -f Dockerfile.worker -t chess-evolve-worker:latest .
  ```
- Run with `CMD ["node", "src/worker.js"]`.
- Concurrency and resources: Allocate at least 1-2 vCPUs and 2GB RAM.

### 3.5 Frontend Deployment (Vite React SPA)
- Build production assets:
  ```bash
  cd frontend
  npm ci
  npm run build
  ```
- Deploy `dist/` to Vercel, Netlify, Cloudflare Pages, or AWS S3 + CloudFront.
- Configure SPA fallback rewrite rule: `/* -> /index.html`.
- Environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_API_BASE_URL=https://api.chessevolve.com/api/v1`

---

## 4. Health Checks & Monitoring

### Liveness & Readiness Probes
| Endpoint | Service | Success Code | Purpose |
|---|---|---|---|
| `GET /health` | Backend | 200 | Process liveness probe |
| `GET /ready` | Backend | 200 (503 on failure) | Deep readiness (DB, Redis, ML, Stockfish) |
| `GET /health` | ML Service | 200 | FastAPI liveness |
| `GET /ready` | ML Service | 200 (503 on failure) | PyTorch & DB connectivity |

### Structured Log Inspection
All backend log events output JSON lines containing:
`timestamp`, `level`, `service`, `environment`, `requestId`, `route`, `statusCode`, `durationMs`, `userId`.
Query example in CloudWatch / Datadog:
```json
{ $.service = "chess-evolve-backend" && $.statusCode >= 500 }
```

---

## 5. Rollback Procedures

### 5.1 Application Code Rollback
If a newly deployed backend or frontend version causes issues:
- Redeploy previous Docker image tag (e.g. `docker pull ...:v1.2.0`).
- Frontend: Roll back instant deployment in Vercel/Cloudflare dashboard.

### 5.2 Model Rollback (Zero Downtime)
If an active Current Self or Peak Self model displays degraded performance:
```http
POST /api/v1/models/rollback
Authorization: Bearer <AUTH_TOKEN>
Content-Type: application/json

{
  "targetVersion": 1
}
```
The system will:
1. Atomically deactivate the current model (`isActive = false, status = 'SUPERSEDED'`).
2. Atomically activate version 1 (`isActive = true, status = 'ACTIVE'`).
3. Restore the matching Peak Self model to preserve dependency tree integrity.
4. Record an immutable audit record in `ModelRetrainingJob`.

---

## 6. Common Failure Recovery Playbook

1. **Chess.com Rate Limiting (HTTP 429)**:
   - Handled automatically via exponential backoff in `ChessComClient`.
   - BullMQ worker pauses and retries with backoff delay.
2. **Postgres Connection Spike**:
   - Verify connection pooler (PgBouncer on port 6543).
   - SQLAlchemy `QueuePool` size is bounded to 5 with `pool_pre_ping=True`.
3. **Stockfish Engine Crash / Freeze**:
   - `StockfishService` enforces 5000ms timeout per move evaluation.
   - Hangs trigger forceful `SIGKILL` cleanup and semaphore release.
4. **Queue Stalls**:
   - Stalled BullMQ jobs are automatically claimed by healthy workers every 30 seconds.
