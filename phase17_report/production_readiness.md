# Chess Evolve - Production Readiness Assessment (Phase 17)

## 1. Readiness Dimension Matrix

| System Domain | Current Status | Required Action for Production Hardening |
|---|---|---|
| **Environment Separation** | Partially Complete | Add `.env.development`, `.env.test`, `.env.production.example`; update `.gitignore` |
| **Database Pool Safety** | Stable but Needs `pool_pre_ping` | Update SQLAlchemy `QueuePool` with `pool_pre_ping=True`; test repeated connection reuse |
| **Durable Job Queuing** | Partial (BullMQ initialized, but async tasks use in-process background promises) | Route heavy sync, feature/dataset extraction, and ML training through Redis BullMQ |
| **ML Worker Reliability** | Functional | Replace FastAPI `BackgroundTasks` with queue execution; enforce state transitions & retry logic |
| **Stockfish Process Management** | Unbounded spawning in `getCandidates` | Implement bounded process pool / semaphore, timeouts (5000ms), and automated cleanup |
| **Model Artifact Storage** | Local filesystem | Implement storage abstraction (local disk + Supabase Storage / S3 provider) with hash validation |
| **Model Rollback** | Not exposed as atomic endpoint | Implement `POST /api/v1/models/rollback` to revert to previous active version atomically |
| **API Security & IDOR** | Good in most routes, gaps in Arena moves | Validate match participation in `arena.js`; ensure 401/403 consistency; strip stack traces |
| **Input Validation** | Ad-hoc checks | Enforce Zod schemas on UUIDs, FEN, moves, pagination, and training triggers |
| **Rate Limiting** | Missing | Add express rate limiting for auth, sync, ML training, coach chat, and game moves |
| **Chess.com API Safety** | Basic client exists | Add exponential backoff, rate limit delay handling, and archive checkpointing |
| **Observability & Logging** | Console logging | Implement JSON structured logger with requestId, route, latency, and sanitized outputs |
| **Health & Readiness** | Basic `/health` exists | Implement `/ready` with dependencies check (DB, Redis, ML Service, Stockfish) |
| **CORS & Security Headers** | Permissive `origin: true` | Restrict `CORS_ORIGINS` to configured domain; add Helmet security headers |
| **Supabase RLS Verification** | Implemented on all main tables | Run comprehensive automated cross-user test suite verifying all 22 tables |
| **Backup & Recovery** | Documented in earlier phases | Create full disaster recovery playbook for Postgres, Redis, and ML artifacts |
| **Docker & Deployment** | `docker-compose.yml` references missing Dockerfiles | Add multi-stage Dockerfiles for Backend, Frontend, and ML Service |
| **CI/CD** | Missing GitHub Actions workflow | Create `.github/workflows/ci.yml` running lint, builds, Prisma, Vitest, and Pytest |

---

## 2. Hardening Action Plan
1. **Fix Critical Security & Resilience Flaws**:
   - Secure Arena routes against IDOR.
   - Restrict CORS and add Helmet security headers.
   - Pool Stockfish execution with strict concurrency and process timeouts.
   - Enforce Zod validation on inputs.
   - Add Redis-backed / in-memory rate limiting.
2. **Move Asynchronous Jobs to BullMQ**:
   - Chess.com sync worker.
   - Feature & dataset generation workers.
   - Dedicated ML training queue/worker.
3. **Model Storage & Rollback**:
   - Implement storage manager.
   - Add atomic rollback endpoint.
4. **Health & Observability**:
   - Implement deep `/ready` check.
   - Implement structured request logging.
5. **Containerization & Deployment**:
   - Build multi-stage Dockerfiles.
   - Write comprehensive deployment and backup documentation.
