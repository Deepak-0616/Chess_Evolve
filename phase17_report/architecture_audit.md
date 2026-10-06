# Chess Evolve - Complete Architecture Audit (Phase 17)

## 1. System Overview & Physical Topology

Chess Evolve is an enterprise-grade AI chess training, behavioral modeling, and personalized coaching system.

```
                           +----------------------------+
                           |  Production React Frontend |
                           |  (Vite + SPA, Tailwind)    |
                           +--------------+-------------+
                                          |
                                    HTTPS / WSS
                                          |
                           +--------------v-------------+
                           |    Production Express API  |
                           |    (Node.js / Port 5000)   |
                           +-------+------------+-------+
                                   |            |
                  +----------------+            +----------------+
                  |                                              |
      +-----------v------------+                    +------------v-----------+
      |  Supabase Auth & DB    |                    |   Redis & BullMQ       |
      |  (PostgreSQL + RLS)    |                    |   (Job Broker / 6379)  |
      +-----------+------------+                    +------------+-----------+
                  |                                              |
                  +----------------+            +----------------+
                                   |            |
                           +-------v------------v-------+
                           |     FastAPI ML Service     |
                           |     (PyTorch / Port 8000)  |
                           +--------------+-------------+
                                          |
                           +--------------v-------------+
                           |   Stockfish Engine Cluster |
                           |   & Model Artifact Storage |
                           +----------------------------+
```

---

## 2. Component Audits

### 2.1 Backend (`backend/`)
- **Technology**: Node.js ES Modules, Express.js 4.18, Prisma ORM 5.10, Axios, chess.js.
- **Routes**:
  - `auth.js`: Profile retrieval, token verification.
  - `chess.js`: Chess.com integration, historical archives sync, profile stats.
  - `games.js`: Game indexing, move analysis retrieval, user isolation enforcement.
  - `dna.js`: Player style DNA metrics and history.
  - `models.js`: Model registry querying, training triggers, inference bridging.
  - `play.js`: Interactive gameplay sessions against Current Self and Peak Self models with Stockfish move candidate evaluation.
  - `arena.js`: Asynchronous AI vs AI arena matchmaking, challenge queues, Elo rating updates.
  - `training.js`: Weakness drill generation, real position extraction, move attempt validation with chess.js.
  - `coach.js`: AI coach conversation history and game analysis.
  - `stockfish.js`: Stockfish engine testing endpoint.
  - `features.js`: Candidate feature extraction triggers and status.
  - `datasets.js`: Chronological train/validation/test split dataset creation.
  - `evolution.js`: Longitudinal progress tracking, weakness trajectories, model comparisons.
  - `retraining.js`: Retraining eligibility checks, pipeline triggers, atomic candidate model activation.
- **Middleware**:
  - `auth.js`: Supabase JWT verification. Extracts `req.user.id` directly from authenticated token.
- **Database Access**:
  - Centralized PrismaClient instance in `src/utils/prisma.js`.
- **Identified Production Gaps**:
  - Missing rate limiting middleware across sensitive endpoints (`/sync`, `/train`, `/retrain`, `/coach/chat`, `/features/generate`, `/datasets/generate`).
  - Missing health readiness check (`/ready`) that verifies Postgres, Redis, and ML service connectivity.
  - Async jobs (`syncJob.js`, `features.js`, `datasets.js`) currently execute via floating Promises or in-process timeouts rather than durable BullMQ workers.
  - Missing standardized error response schema without stack traces in production.
  - Unbounded Stockfish process invocation in `StockfishService.getCandidates`.

### 2.2 ML Service (`ml-service/`)
- **Technology**: Python 3.10, FastAPI, PyTorch, SQLAlchemy 2.0 with QueuePool, psycopg2, python-chess.
- **Subsystems**:
  - `app/models/current_self`: Neural network architecture for current player behavioral emulation.
  - `app/models/peak_self`: Model predicting peak/high-performance decisions based on quality filters.
  - `app/retraining`: Pipeline for expanding-window retraining, quality gates, and atomic activation.
  - `app/features`: Feature extraction pipelines (positional, player, tactical, history).
  - `app/datasets`: Dataset splitting and parquet/database persistence.
  - `app/inference_api.py`: Low-latency move prediction endpoint.
  - `app/train_api.py`: Training invocation endpoints.
  - `app/db.py`: Centralized SQLAlchemy engine with `QueuePool`.
- **Identified Production Gaps**:
  - `app/train_api.py` and `app/retraining/router.py` use FastAPI `BackgroundTasks` instead of durable external workers.
  - `db.py` missing `pool_pre_ping=True` which can lead to stale connections if Supabase drops an idle TCP socket.
  - Artifacts stored solely on local filesystem paths (`./artifacts/...`) without cloud storage abstraction or fallback.

### 2.3 Frontend (`frontend/`)
- **Technology**: React 18, Vite 5, Tailwind CSS, Lucide React, Axios.
- **Routing**: Full SPA with client-side routing (`/`, `/login`, `/connect`, `/preparation`, `/training`, `/training/session/:sessionId`, `/training/progress`, `/evolution`, `/arena`, `/coach`).
- **Identified Production Gaps**:
  - `client.js` defaults fallback `API_BASE_URL` to `http://localhost:5000/api/v1` if environment variable is missing.
  - Missing unified rollback action in Model Management UI.

### 2.4 Database Schema & RLS (`prisma/schema.prisma`)
- 22 primary domain models.
- Row-Level Security (RLS) enabled on all user-owned tables.
- Foreign keys and unique composite indices prevent duplicate versions or corrupt states.
