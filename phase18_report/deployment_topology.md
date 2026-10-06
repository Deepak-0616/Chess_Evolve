# Chess Evolve - Production Cloud Deployment Topology (Phase 18)

## 1. Executive Summary

The production deployment of Chess Evolve AI relies on a modular, containerized microservices architecture designed to satisfy strict performance, compute, memory, and persistence guarantees:

- **Compute & UCI Engine**: CPU-optimized execution environments for Stockfish move evaluation and PyTorch tensor operations.
- **Asynchronous Execution**: Durable Redis/BullMQ worker queues decoupled from the web layer to eliminate dropped jobs and timeout failures.
- **Persistence & Storage**: Supabase PostgreSQL with Row-Level Security (RLS) and transaction connection pooling; durable local/S3-backed model checkpoint storage with SHA-256 verification.
- **Security & Networking**: End-to-end TLS (HTTPS/WSS), strict CORS origin allowlists, Supabase JWT verification, and non-root Docker container runtimes.

---

## 2. Recommended Cloud Deployment Target: AWS (Amazon Web Services)

### Topology Diagram

```
                              [ INTERNET CLIENTS ]
                                       │
                                       ▼ (HTTPS / 443)
                         [ AWS CloudFront CDN / ACM ]
                         ┌─────────────┴─────────────┐
                         ▼ (Host: app.chessevolve.com) ▼ (Path: /api/* or api.chessevolve.com)
               [ AWS S3 / CloudFront ]      [ AWS Application Load Balancer (ALB) ]
               (React Vite Static SPA)       ┌───────────────┴───────────────┐
                                             ▼ (Target Group: Port 5000)     ▼ (Target Group: Port 8000)
                                    [ ECS Service: Backend ]        [ ECS Service: ML Engine ]
                                    (2x Tasks: 1 vCPU, 2GB RAM)     (2x Tasks: 2 vCPU, 4GB RAM)
                                             │                               ▲
                                             ├───────────────────────────────┤
                                             ▼                               │
                                [ AWS ElastiCache / Upstash ]                │
                                (Redis 7 TLS, maxmemory-policy)              │
                                             │                               │
                                             ▼                               │
                                    [ ECS Service: Worker ]                  │
                                    (1-2 Tasks: 2 vCPU, 4GB RAM)             │
                                             │                               │
                                             ├───────────────────────────────┘
                                             ▼
                                  [ Amazon EFS / AWS S3 ]
                                  (Shared Model Checkpoints: /artifacts)
                                             │
                                             ▼
                                  [ Supabase PostgreSQL ]
                                  (Transaction Pooler: 6543 / Direct: 5432)
```

---

## 3. Service Specifications & Resource Allocation

| Component | AWS / Cloud Service | vCPU | RAM | Disk / Storage | Scaling Policy | Health Check |
|---|---|---|---|---|---|---|
| **Frontend** | AWS CloudFront + S3 (or Vercel / Cloudflare Pages) | Serverless | Serverless | Static Assets (Edge CDN) | Global Edge Anycast | `GET /index.html` (200) |
| **Backend API** | AWS ECS Fargate (`backend`) | 1 vCPU | 2 GB | 20 GB Ephemeral | Min: 2, Max: 6 (CPU > 70%) | `GET /health` (200)<br>`GET /ready` (200) |
| **ML Inference** | AWS ECS Fargate (`ml-service`) | 2 vCPU | 4 GB | 30 GB EFS Mount (`/app/artifacts`) | Min: 2, Max: 4 (CPU > 75%) | `GET /health` (200)<br>`GET /ready` (200) |
| **Queue Worker** | AWS ECS Fargate (`worker`) | 2 vCPU | 4 GB | 20 GB Ephemeral + Stockfish | Min: 1, Max: 4 (Queue Depth > 25) | Docker Process & Redis Ping |
| **Redis Cache** | AWS ElastiCache / Upstash Managed Redis | 1 vCPU | 1.5 GB | In-memory + AOF Persistence | Primary + Read Replica | Redis `PING -> PONG` |
| **Database** | Managed Supabase PostgreSQL | 2 vCPU | 4 GB | 50 GB NVMe (Auto-expanding) | PgBouncer Pooler (Max 50 conns) | `SELECT 1` |
| **Model Storage**| AWS S3 Bucket + EFS Volume | N/A | N/A | S3 Object Store + Local Mount | Standard Tier + Replication | SHA-256 Validation |

---

## 4. Networking, Isolation & Security Groups

1. **VPC Subnets**:
   - **Public Subnet**: ALB and Internet Gateway. Ingress allowed only on ports 80 and 443. Port 80 automatically issues 301 redirect to HTTPS.
   - **Private Application Subnet**: ECS Tasks (`backend`, `ml-service`, `worker`). Ingress allowed only from ALB Security Group on ports 5000 and 8000. Outbound traffic routes through NAT Gateway to reach Supabase and Chess.com.
   - **Private Data Subnet**: ElastiCache Redis and EFS Mount Targets. Ingress allowed strictly from ECS Tasks Security Group on ports 6379 and 2049.
2. **TLS / SSL Termination**:
   - AWS Certificate Manager (ACM) manages wildcard certificate (`*.chessevolve.com`).
   - ALB handles TLS 1.3 termination and attaches `X-Forwarded-Proto: https` headers.
3. **Container Security**:
   - Containers run as non-root users (`node:1000` and `appuser:1000`).
   - Read-only root filesystem where feasible, with specific write permissions only on `/tmp` and `/app/artifacts`.
