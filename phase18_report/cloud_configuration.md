# Chess Evolve - Production Cloud Configuration & Secrets Matrix (Phase 18)

## 1. Production Environment Variables Matrix

Every variable listed below is required and actively referenced by the Chess Evolve codebase. No extraneous or fabricated variables are included.

### 1.1 Frontend (Vite React SPA)
| Variable Name | Required | Scope | Purpose | Example Value |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Client Public | Supabase Project Gateway URL | `https://prod-ref.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | Client Public | Supabase anonymous client JWT | `eyJhbGciOi...` |
| `VITE_API_BASE_URL` | Optional | Client Public | Production API Gateway Base URL (falls back to `/api/v1` for Nginx reverse proxy) | `https://api.chessevolve.com/api/v1` |

### 1.2 Backend API & Queue Worker (Node.js Express / BullMQ)
| Variable Name | Required | Scope | Purpose | Example Value |
|---|---|---|---|---|
| `NODE_ENV` | Yes | Server Secret | Execution environment mode | `production` |
| `PORT` | Yes | Server Secret | Express listening port | `5000` |
| `LOG_LEVEL` | No | Server Config | Structured logger output filter (`debug`, `info`, `warn`, `error`) | `info` |
| `DATABASE_URL` | Yes | Server Secret | Supabase Transaction Pooler URL (Port 6543 with `?pgbouncer=true`) | `postgresql://postgres.xxx:pwd@aws-0.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_DATABASE_URL` | Yes | Server Secret | Supabase Direct Session Connection URL (Port 5432 for migrations) | `postgresql://postgres.xxx:pwd@aws-0.pooler.supabase.com:5432/postgres` |
| `SUPABASE_URL` | Yes | Server Secret | Supabase Project Gateway URL for server-side auth verification | `https://prod-ref.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes | Server Secret | Public key for client verification fallback | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server Secret | Elevated service role key (NEVER exposed to frontend) | `eyJhbGciOi...` |
| `REDIS_URL` | Yes | Server Secret | Managed Redis connection string (supports `rediss://` TLS) | `rediss://default:pwd@prod-redis.internal:6379` |
| `ML_SERVICE_URL` | Yes | Server Config | Internal VPC URL for ML FastAPI engine | `http://ml-service.internal:8000` |
| `ML_SERVICE_AUTH_SECRET` | Yes | Server Secret | Shared HMAC secret for internal service-to-service validation | `sec_prod_a9f8...` |
| `CORS_ORIGINS` | Yes | Server Config | Comma-delimited list of allowlisted frontend origins | `https://app.chessevolve.com` |
| `STOCKFISH_PATH` | Yes | Server Config | Stockfish UCI engine binary location inside container | `/usr/bin/stockfish` |
| `CHESS_API_BASE_URL` | No | Server Config | Chess.com Public API Base URL | `https://api.chess.com/pub` |
| `OPENAI_API_KEY` | Optional | Server Secret | OpenAI API key for Coach Natural Language generation | `sk-prod-...` |

### 1.3 ML Service (FastAPI PyTorch Engine)
| Variable Name | Required | Scope | Purpose | Example Value |
|---|---|---|---|---|
| `PORT` | Yes | Server Config | FastAPI listening port | `8000` |
| `DATABASE_URL` | Yes | Server Secret | Supabase PostgreSQL URL (QueuePool connection) | `postgresql://postgres.xxx:pwd@aws-0.pooler.supabase.com:5432/postgres` |
| `REDIS_URL` | Yes | Server Secret | Managed Redis URL for state sync | `rediss://default:pwd@prod-redis.internal:6379` |
| `MODEL_STORAGE_PATH` | Yes | Server Config | Persistent directory for PyTorch `.pt` artifacts | `/app/artifacts` |
| `STOCKFISH_PATH` | Yes | Server Config | Stockfish UCI engine binary location inside container | `/usr/games/stockfish` |
| `ML_SERVICE_AUTH_SECRET` | Yes | Server Secret | Shared secret matching Backend | `sec_prod_a9f8...` |

### 1.4 Object Storage & Disaster Recovery (S3 / Cloudflare R2)
| Variable Name | Required | Scope | Purpose | Example Value |
|---|---|---|---|---|
| `S3_BUCKET_NAME` | Yes | Server Config | Target bucket for model checkpoint backup replication | `chess-evolve-model-artifacts-prod` |
| `AWS_ACCESS_KEY_ID` | Yes | Server Secret | IAM credential with scoped write permissions | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Yes | Server Secret | IAM credential secret | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | Yes | Server Config | AWS Region hosting the bucket | `us-east-1` |

---

## 2. Secrets Management & Zero-Leakage Architecture

1. **AWS Secrets Manager / Parameter Store**:
   - All server secrets (`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`, `ML_SERVICE_AUTH_SECRET`, `OPENAI_API_KEY`) are stored in AWS Secrets Manager.
   - ECS Task Execution Role grants read-only access to specific ARNs:
     ```json
     {
       "Effect": "Allow",
       "Action": ["secretsmanager:GetSecretValue"],
       "Resource": ["arn:aws:secretsmanager:us-east-1:*:secret:chess-evolve/*"]
     }
     ```
2. **Client Redaction Guarantee**:
   - `SUPABASE_SERVICE_ROLE_KEY` is never prefixed with `VITE_` and is not bundled by Vite.
   - `backend/src/middleware/logger.js` automatically sanitizes incoming requests and excludes Authorization headers, passwords, and tokens from JSON log output.
3. **Database Migration Isolation**:
   - `prisma/schema.prisma` separates `DATABASE_URL` (runtime pooler) and `DIRECT_DATABASE_URL` (direct migration connection).
   - Migration operations (`npx prisma migrate deploy`) run in an isolated CI/CD step or ECS one-off task using `DIRECT_DATABASE_URL` to avoid connection pooler deadlocks.

---

## 3. Google OAuth & Supabase Production Authentication Configuration

1. **Google Cloud Console Setup**:
   - Create OAuth 2.0 Web Application credential in Google Cloud Console.
   - Set Authorized JavaScript Origins: `https://app.chessevolve.com`.
   - Set Authorized Redirect URI: `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback`.
2. **Supabase Authentication Settings**:
   - Under `Authentication -> URL Configuration`:
     - **Site URL**: `https://app.chessevolve.com`
     - **Additional Redirect URLs**:
       - `https://app.chessevolve.com/connect`
       - `https://app.chessevolve.com/auth/callback`
   - Under `Authentication -> Providers -> Google`:
     - Enabled: `true`
     - Client ID: Injected from Google Console
     - Client Secret: Injected from Google Console
3. **Frontend Dynamic Origin Binding**:
   - `frontend/src/contexts/AuthContext.jsx` configures OAuth dynamically using `${window.location.origin}/connect`, ensuring seamless redirects across custom domains without hardcoded development URLs.
