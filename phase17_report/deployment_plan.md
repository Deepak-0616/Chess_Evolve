# Chess Evolve - Production Deployment Plan (Phase 17)

## 1. Target Infrastructure Topology

```
                       [ Internet Users ]
                               |
                        [ Cloudflare CDN ]
                               |
            +------------------+------------------+
            |                                     |
   [ Frontend Static Host ]               [ API Gateway / ALB ]
   (Vercel / Netlify / S3)                        |
                                      +-----------+-----------+
                                      |                       |
                             [ Backend Instances ]   [ ML Service Cluster ]
                                      |                       |
                                      +-----------+-----------+
                                                  |
                                   +--------------+--------------+
                                   |                             |
                          [ Supabase Managed ]           [ Redis Cluster ]
                          - PostgreSQL 15               - BullMQ Job Queues
                          - Storage Buckets             - Rate Limiter
                          - Real-time / Auth
```

---

## 2. Infrastructure Requirements

1. **Frontend**:
   - Node 18+ for Vite static build.
   - SPA rewrite rule (`/* -> /index.html`).
   - Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`.

2. **Backend**:
   - Node 20 LTS container with multi-stage build.
   - Persistent Stockfish binary pre-installed or mounted at `/usr/local/bin/stockfish`.
   - Redis 7 for BullMQ queue orchestration.
   - Supabase PostgreSQL connection with connection pooling (`DATABASE_URL`).

3. **ML Service**:
   - Python 3.10+ container with PyTorch (CPU or GPU-accelerated based on cloud profile).
   - High memory allocation (minimum 2GB RAM per worker process).
   - Storage volume for persistent model checkpoints.

4. **Background Workers**:
   - Standalone BullMQ worker process running `currentSelfTrainingWorker.js`, `syncWorker.js`, etc.

---

## 3. Step-by-Step Rollout Checklist

1. **Phase 1: Environment & Secrets Configuration**
   - Create production Supabase project.
   - Run `npx prisma migrate deploy` or applied SQL schema.
   - Configure OAuth redirects for Google login in Supabase dashboard.
   - Set up Redis cluster (Upstash / AWS ElastiCache / Redis Cloud).

2. **Phase 2: Backend & ML Service Provisioning**
   - Deploy ML Service container; verify `/health` and `/ready`.
   - Deploy Backend container; verify `/health` and `/ready`.
   - Verify network connectivity between Backend and ML Service (`ML_SERVICE_URL`).

3. **Phase 3: Worker Daemon Initialization**
   - Start queue worker instances for Chess.com synchronization and model training.

4. **Phase 4: Frontend Deployment & Verification**
   - Build frontend assets with production API URL.
   - Deploy to static hosting.
   - Test end-to-end authentication, game sync, training, arena, and coach interactions.
