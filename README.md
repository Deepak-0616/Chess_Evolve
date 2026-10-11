# Chess Evolve

> **AI-Powered Chess Decision Intelligence Platform**  
> *Transform your raw Chess.com game history into personalized PyTorch neural decision models (Current Self & Peak Self), 13-dimension Chess DNA, and interactive coaching.*

---

## Overview

**Chess Evolve** is a full-stack, multi-user AI chess intelligence platform that analyzes your actual games, identifies your tactical and strategic habits, and trains custom neural networks modeled on your decision patterns:

* **Current Self Model**: Learns how you *actually* play across every game phase, predicting your exact move probabilities and capturing your stylistic habits, tactical strengths, and recurring blind spots.
* **Peak Self Model**: Learns how you *should* play on your best day. It optimizes move quality against Stockfish while treating your Current Self probability distribution as a foundational stylistic anchor—preventing generic engine collapse and preserving your tactical identity.
* **13-Dimension Chess DNA**: A comprehensive quantitative breakdown of your chess personality (Aggression, Risk-Taking, Tactical Tendency, Positional Sense, King Safety, Trading Bias, and more).
* **Interactive AI Arena & Play**: Challenge your own AI models, test against other community player models, train custom blunder-correction positions, and get feedback from an AI coach.

---

## System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        React Frontend (Vite)                           │
│     (React Chessboard, Recharts, Framer Motion, Tailwind CSS)          │
│                      http://localhost:3000                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / Bearer JWT
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Node.js / Express Backend API                      │
│            (Supabase Auth, Stockfish UCI Service, BullMQ)              │
│                      http://localhost:5000                             │
└───────────┬───────────────────────┬──────────────────────┬─────────────┘
            │                       │                      │
            ▼                       ▼                      ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  Prisma ORM Client   │ │   BullMQ / Redis     │ │  FastAPI ML Service  │
│          │           │ │ (Background Workers  │ │  (PyTorch Neural     │
│          ▼           │ │  & Sync Pipelines)   │ │   Decision Models)   │
│ Supabase PostgreSQL  │ │  (In-Memory Fallback)│ │ http://localhost:8000│
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

---

## Key Features

* **Multi-User Authentication**: Supabase Auth with Google OAuth & cryptographically verified JWT tokens.
* **Automated Chess.com Sync**: Incremental monthly archive discovery, PGN parsing, game deduplication, and non-blocking background synchronization.
* **Engine Evaluation Pipeline**: Move-by-move Stockfish centipawn loss (CP Loss) analysis, candidate ranking, and classification (*Best, Good, Inaccuracy, Mistake, Blunder*).
* **13-Dimensional Chess DNA**:
  * *Aggression*, *Risk Taking*, *Tactical Preference*, *Positional Sense*, *Defensive Tenacity*, *Sacrifice Tendency*, *Trading Bias*, *Opening Diversity*, *Endgame Skill*, *King Safety*, *Attack Orientation*, *Simplification Rate*, and *Time Trouble Factor*.
* **PyTorch Candidate Move Rankers**:
  * **Current Self**: 16-dimensional position vector + candidate feature embeddings evaluated via Cross-Entropy Loss.
  * **Peak Self**: Dual-head quality and style alignment model with blunder-protection guards and ECE calibration.
* **Resilient Offline Architecture**: Automatic graceful fallback to in-memory queues and offline candidate evaluation if Redis or ML service are temporarily unavailable.
* **Interactive Arena & Play Mode**: Play against your own Current Self or Peak Self, or discover public player models in the community Arena.
* **AI Coach & Targeted Training**: Position selector that pulls puzzles directly from your historical mistakes and weaknesses.

---

## Repository Structure

```text
Chess_Evolve/
├── backend/                       # Express Node.js API Service
│   ├── src/
│   │   ├── middleware/            # Auth, rate limiting, and request validation
│   │   ├── routes/                # Express routes (auth, chess, games, dna, training, arena, play)
│   │   ├── services/              # Stockfish service, sync jobs, coach, DNA, ML bridge
│   │   ├── queues/                # BullMQ background queue definitions
│   │   ├── utils/                 # Prisma singleton, Redis client, logger
│   │   └── index.js               # Express application entrypoint
│   ├── prisma/                    # Database schema and migration files
│   ├── Dockerfile                 # Production backend Docker container
│   ├── Dockerfile.worker          # Dedicated BullMQ worker daemon Dockerfile
│   └── package.json
│
├── frontend/                      # React SPA (Vite)
│   ├── src/
│   │   ├── components/            # Layout sidebar, Auth forms, Reusable UI
│   │   ├── contexts/              # Global AuthContext & multi-session state
│   │   ├── pages/                 # Dashboard, Games, DNA, Training, Coach, Arena, Play
│   │   └── api/                   # Axios API client
│   ├── Dockerfile                 # Production multi-stage Nginx build
│   └── package.json
│
├── ml-service/                    # Python FastAPI Machine Learning Service
│   ├── app/
│   │   ├── datasets/              # Dataset schemas and target generation
│   │   ├── features/              # Position and candidate feature extractors
│   │   ├── models/                # PyTorch neural models (Current Self & Peak Self)
│   │   ├── retraining/            # Continuous retraining, quality gates, and rollback
│   │   ├── tests/                 # Pytest test suite
│   │   ├── db.py                  # Resilient SQLAlchemy engine with URL sanitization
│   │   └── main.py                # FastAPI routes & endpoints
│   ├── Dockerfile                 # Python 3.10 CPU container
│   ├── requirements.txt           # Python dependencies
│   └── run.py                     # Local uvicorn development runner
│
├── prisma/                        # Root Prisma schema & migrations
├── .github/workflows/ci.yml       # Production GitHub Actions CI Pipeline
├── docker-compose.yml             # Multi-container local orchestration
└── README.md
```

---

## Prerequisites

* **Node.js**: `v20.x` or `v22.x` (LTS recommended)
* **Python**: `3.10+`
* **Stockfish**: Installed locally or available via PATH (`stockfish`)
* **PostgreSQL / Supabase**: Supabase database instance (or local PostgreSQL 16)
* **Redis** *(Optional for local dev)*: `v7.x` (App seamlessly falls back to in-memory mode if Redis is offline)

---

## Environment Configuration

### 1. Backend (`backend/.env`)

```ini
# Supabase PostgreSQL Database (Session Pooler on port 5432 is recommended for persistent servers)
DATABASE_URL="postgresql://postgres.xxx:password@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?connection_limit=10&connect_timeout=30&pool_timeout=30"
DIRECT_DATABASE_URL="postgresql://postgres.xxx:password@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

# Supabase Auth
SUPABASE_URL="https://<your-project-ref>.supabase.co"
SUPABASE_ANON_KEY="<your-supabase-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<your-supabase-service-role-key>"
JWT_SECRET="<your-jwt-secret>"

# Server Config
PORT=5000
NODE_ENV=development
STOCKFISH_PATH="C:\\path\\to\\stockfish.exe" # Or /usr/bin/stockfish on Linux
ML_SERVICE_URL="http://localhost:8000"
REDIS_URL="redis://localhost:6379"
```

### 2. Frontend (`frontend/.env`)

```ini
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<your-supabase-anon-key>"
VITE_API_BASE_URL="http://localhost:5000/api/v1"
```

### 3. ML Service (`ml-service/.env` or shared from `backend/.env`)

```ini
DATABASE_URL="postgresql://postgres.xxx:password@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
STOCKFISH_PATH="/usr/bin/stockfish"
PORT=8000
```

---

## Quick Start (Local Development)

### 1. Database Setup
Ensure `backend/.env` is configured with your database URL, then run:
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:db-push
```

### 2. Running Services Concurrently

Open three terminal windows:

**Terminal 1 — Backend API**:
```bash
cd backend
npm run dev
# Running on http://localhost:5000
```

**Terminal 2 — Python ML Service**:
```bash
cd ml-service
python -m pip install -r requirements.txt
python run.py
# Running on http://localhost:8000
```

**Terminal 3 — React Frontend**:
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:3000
```

---

## Running with Docker Compose

To start the entire multi-container production stack (PostgreSQL, Redis, Backend, Worker, ML Service, and Frontend):

```bash
docker-compose up --build -d
```

| Service | Port | Description |
| :--- | :--- | :--- |
| **Frontend** | `http://localhost:3000` | Production React SPA served via Nginx |
| **Backend API** | `http://localhost:5000` | Express API server |
| **ML Service** | `http://localhost:8000` | FastAPI PyTorch prediction engine |
| **Redis** | `localhost:6379` | BullMQ message broker |
| **Worker** | *Internal* | Background synchronization & analysis daemon |

---

## Testing

### Backend Test Suite (Vitest)
Includes authentication security, RLS data isolation, Stockfish process safety, database connection pooling, and ML offline resilience tests:
```bash
cd backend
npm test
```
*Result: 11 test suites passed (78 tests total)*

### ML Service Test Suite (Pytest)
Tests database connection pooling safety, model state artifact hardening, ECE calibration, and retraining pipeline quality gates:
```bash
cd ml-service
python -m pytest app/tests
```
*Result: 9 tests passed*

### Continuous Integration (GitHub Actions)
The repository includes a production CI pipeline in `.github/workflows/ci.yml`:
* Spins up disposable PostgreSQL 16 service
* Validates Prisma schema & runs migrations
* Executes full Backend Vitest suite
* Executes full ML Pytest suite
* Runs Gitleaks secret detection scan
* Compiles Frontend production Vite bundle

---

## Machine Learning Engine Architecture

### 1. Current Self (Habit & Preference Replicator)
* **Goal**: Accurately predict the moves you *actually* make given your historical games.
* **Input Features**:
  * 16-dimensional board state vector (material balance, active piece counts, castling rights, turn, game phase).
  * Candidate move vectors (Stockfish engine rank, centipawn loss, tactical flag, sacrifice flag).
* **Architecture**: Fully connected deep ranker with dropout regularization and softmax probability output.

### 2. Peak Self (Style-Anchored Optimization)
* **Goal**: Recommend optimal moves while maintaining your tactical signature.
* **Mechanism**:
  $$\text{Score} = w_1 \cdot \text{EngineQuality} + w_2 \cdot \text{StyleLogits} + w_3 \cdot \text{WeaknessCorrection}$$
* **Blunder Guard**: Strictly filters out candidates with centipawn loss $> 150$, guaranteeing that tactical blunders are never recommended.

---

## Core API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user details |
| `POST` | `/api/v1/chess/connect` | Link Chess.com username and trigger sync |
| `GET` | `/api/v1/chess/profile` | Get connected profile and sync status |
| `GET` | `/api/v1/games` | Get paginated games with filters & accuracy |
| `GET` | `/api/v1/dna` | Get 13-dimension Chess DNA metrics |
| `POST` | `/api/v1/training/session` | Start targeted weakness training session |
| `POST` | `/api/v1/play/move` | Request move from Current Self or Peak Self model |
| `GET` | `/api/v1/arena/models` | List discoverable public community AI models |
| `GET` | `/health` | Service health check |

---

## Security & Best Practices

* **Row-Level Security (RLS)**: Enforced via Supabase JWT user claims on all database tables.
* **Credential Protection**: Zero secrets or credentials committed to Git; all environment variables sanitized.
* **Stockfish Safety**: Process execution isolated through child process semaphores with strict parameter validation to prevent command injection.
* **Database Connection Resilience**: Automatic URL sanitization prevents driver incompatibilities across Prisma and SQLAlchemy.
