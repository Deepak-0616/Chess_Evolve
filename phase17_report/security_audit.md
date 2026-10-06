# Chess Evolve - Security & Isolation Audit (Phase 17)

## 1. Authentication & Identity Verification
- **Mechanism**: Supabase JWT with asymmetric validation via `@supabase/supabase-js`.
- **Principle**: The client never determines `userId`. The backend extracts `req.user.id` strictly from the decoded and verified JWT payload.
- **Production Requirement**: In `NODE_ENV === "production"`, unverified or fallback JWT decoding must be strictly disabled. Any invalid or missing bearer token immediately yields HTTP 401.

---

## 2. In-Depth Route Authorization & IDOR Matrix

| Route | Method | Enforced Ownership Check | Vulnerability Assessment |
|---|---|---|---|
| `/api/v1/auth/me` | GET | `req.user.id` | Secure |
| `/api/v1/chess/profile` | GET | `where: { userId: req.user.id }` | Secure |
| `/api/v1/chess/sync` | POST | Triggers sync strictly for `req.user.id` | Secure |
| `/api/v1/games` | GET | Filtered by user's `chessProfileId` | Secure |
| `/api/v1/games/:id` | GET | Verified `game.chessProfile.userId === req.user.id` | Secure |
| `/api/v1/play/sessions/:id` | GET/POST | Verified `session.userId === req.user.id` | Secure |
| `/api/v1/training/sessions/:id`| GET/POST | Verified `session.userId === req.user.id` | Secure |
| `/api/v1/coach/conversations/:id` | GET | Verified `conversation.userId === req.user.id` | Secure |
| `/api/v1/arena/matches/:id/moves` | POST | **Missing participation check** | **IDOR Vulnerability Found (Needs Fix)** |
| `/api/v1/arena/matches/:id/resign` | POST | **Missing participation check** | **IDOR Vulnerability Found (Needs Fix)** |
| `/api/v1/models/rollback` | POST | Derived strictly from authenticated `req.user.id` | **New feature to implement** |

---

## 3. Database Row-Level Security (RLS) Review
- PostgreSQL RLS is enabled on all core tables:
  - `User`, `ChessProfile`, `Game`, `GameAnalysis`, `PositionAnalysis`, `ChessDNA`, `MLDataset`, `MLDatasetRecord`, `MLModelVersion`, `PlaySession`, `ArenaProfile`, `ArenaMatch`, `CoachConversation`, `TrainingSession`, `EvolutionSnapshot`, `ModelRetrainingJob`, `ModelUpdateCandidate`.
- Service-role key is isolated strictly to the backend environment and never bundled in the frontend build.

---

## 4. Input Sanitization & Attack Surface
- **SQL Injection**: Prevented through Prisma ORM parameterized queries and SQLAlchemy bound parameters (`:userId`).
- **Command Injection**: `child_process.spawn` for Stockfish must never pass unverified arguments. Stockfish executable path is configured strictly via `STOCKFISH_PATH`.
- **Malicious FEN / PGN Injection**: Enforce length limits and `chess.js` validation prior to evaluation.
- **Path Traversal**: Disallow arbitrary model paths supplied by users. All models load from structured directories indexed by `userId` and `modelVersionId`.

---

## 5. Secret Leakage Audit
- No private keys, database passwords, or JWT secrets are committed to Git.
- Frontend `.env` only exposes public variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`).
- All error responses in production will suppress stack traces and internal SQL details.
