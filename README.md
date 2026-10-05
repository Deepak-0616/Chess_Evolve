# CHESS EVOLVE — Production-Ready AI Chess Decision Intelligence Platform

## 1. Project Overview
Chess Evolve is a full-stack, multi-user AI platform that transforms your raw Chess.com game history into a personalized decision model. By combining full-history PubAPI synchronization, move-by-move Stockfish position evaluations, 13-dimension Chess DNA computation, and PyTorch Neural Networks (Current Self & Peak Self), Chess Evolve allows players to analyze their play, train targeted tactical weaknesses, and play interactive matches against AI models built from their own decision patterns.

## 2. Problem Statement
Generic chess engines like Stockfish calculate objective best moves but do not reflect individual human playing styles or personal tactical habits. Existing coaching apps fail to provide personalized AI opponents that simulate how a player actually decision-makes or how they would play at their absolute peak performance while preserving their distinct tactical identity.

## 3. Product Vision
To empower every chess player with a personal AI decision ecosystem:
- **Current Self**: Predicts your actual decision probabilities in any position. It learns to replicate how you *actually* play, capturing stylistic preferences, strengths, and characteristic weaknesses.
- **Peak Self**: Learns how you *should* play on your best day. It trains on "Peak Targets" (which balances engine quality with your style) while treating the Current Self's probability distribution as a foundational input. This prevents the model from collapsing into raw Stockfish and keeps the moves feeling human.
- **AI Arena**: Allows community players to test their skills against discoverable user models without exposing private game records or raw model binaries.

## 4. Features
- **Supabase Auth & Google OAuth**: Multi-user session management with zero hardcoded credentials.
- **Full-History Chess.com Sync**: Automatic archive discovery, game deduplication, and PGN parsing.
- **Stockfish Engine Pipeline**: Centipawn loss (CP Loss) calculation, candidate move ranking, and move classification (Best, Good, Inaccuracy, Mistake, Blunder).
- **13-Dimension Chess DNA**: Aggression, Risk Taking, Tactical Preference, Positional Preference, Defensive Ability, Sacrifice Tendency, Trading Tendency, Opening Diversity, Endgame Ability, King Safety, Attack Preference, Simplification Preference, and Time Pressure Behavior.
- **PyTorch Candidate Move Rankers**: Dedicated neural networks trained on user decision data.
- **Interactive Game Board & Analysis**: Replay games, view evaluation graphs, inspect Stockfish alternatives, and play against your own AI models in real-time.
- **Community AI Arena**: Discover and challenge public player models.

## 5. Architecture
```text
React (Vite + Tailwind CSS + Recharts + React Chessboard)
                       ↓
Supabase Auth (Google OAuth) + Bearer JWT
                       ↓
Express TypeScript Backend API
                       ↓
Prisma ORM ←→ Supabase PostgreSQL
                       ↓
BullMQ / AccountSyncManager Engine Pipeline
   ├── Chess.com PubAPI
   ├── Stockfish Position Analyzer
   └── 13-Dimension DNA Calculator
                       ↓
FastAPI Python ML Service (PyTorch Candidate Move Ranker)
```

## 6. Authentication
Authentication is powered by **Supabase Auth** integrated with **Google OAuth**.
- The backend verifies Supabase Bearer JWTs and extracts the Supabase Auth User UUID (`auth.user.id`).
- User records are dynamically created and updated in PostgreSQL.
- No passwords, custom auth tables, or hardcoded usernames exist anywhere in the code.

## 7. Supabase Setup
1. Create a project at [Supabase](https://supabase.com).
2. Note your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
3. In your `.env` file, set:
   ```env
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_URL=https://<your-project-ref>.supabase.co
   SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```

## 8. Google OAuth Setup
1. Go to Google Cloud Console -> APIs & Services -> Credentials.
2. Create OAuth 2.0 Client ID for Web Applications.
3. Add Authorized Redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
4. Copy Client ID & Client Secret into Supabase Dashboard under Auth -> Providers -> Google.

## 9. Database Setup
The platform uses Supabase PostgreSQL accessed via Prisma ORM:
```env
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgboiler=true
DIRECT_DATABASE_URL=postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

## 10. Prisma Setup
Navigate to backend directory and run:
```bash
npx prisma generate --schema=../prisma/schema.prisma
npx prisma db push --schema=../prisma/schema.prisma
```

## 11. Chess.com API Setup
Chess Evolve interfaces directly with the public official Chess.com PubAPI:
- Profile: `https://api.chess.com/pub/player/{username}`
- Archives: `https://api.chess.com/pub/player/{username}/games/archives`
- Games: `https://api.chess.com/pub/player/{username}/games/{yyyy}/{mm}`

## 12. Full Synchronization System
Synchronization runs asynchronously in the background (`AccountSyncManager`):
1. **Profile Verification**: Validates username on Chess.com.
2. **Archive Discovery**: Fetches all available monthly archive URLs.
3. **Game Import & Deduplication**: Imports raw games, parses PGNs using `chess.js`, computes deterministic game IDs to prevent duplicates.
4. **Position Analysis**: Evaluates player decisions using Stockfish.
5. **DNA Computation**: Calculates 13 style dimensions.
6. **ML Training**: Triggers Current Self & Peak Self model training.

## 13. Stockfish Setup
Position analysis uses Stockfish engine evaluations:
- Evaluates FEN position before and after each player move.
- Computes Centipawn Loss (`cpLoss = Math.abs(bestEval - playedEval)`).
- Classifies moves: BEST (<=15 CP), GOOD (<=45 CP), INACCURACY (<=110 CP), MISTAKE (<=250 CP), BLUNDER (>250 CP).

## 14. Redis Setup
Redis is used by BullMQ for background synchronization jobs:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 15. BullMQ
Background workers run background jobs for:
- `PROFILE_SYNC`
- `ARCHIVE_DISCOVERY`
- `GAME_IMPORT`
- `POSITION_ANALYSIS`
- `DNA_GENERATION`
- `MODEL_TRAINING`

## 16. ML Environment
The ML service is built with **Python 3.10**, **FastAPI**, and **PyTorch**.
Dependencies: `fastapi`, `uvicorn`, `torch`, `scikit-learn`, `pandas`, `numpy`, `pydantic`.

## 17. Current Self
The Current Self model is a PyTorch Candidate Move Ranker:
- Input: 16-dimensional position feature vector (material balance, piece counts, turn, castling rights).
- Output: Softmax probability distribution over legal candidate moves matching the player's personal decision habits.

## 18. Peak Self
The Peak Self model is a dual-head Neural Network:
- Blends candidate quality scores with the user's style probability logits.
- Maximizes win-rate decision quality while preserving the user's distinct tactical identity signature.

## 19. Chess DNA
13 style dimensions computed from real game positions:
Aggression, Risk Taking, Tactical Preference, Positional Preference, Defensive Ability, Sacrifice Tendency, Trading Tendency, Opening Diversity, Endgame Ability, King Safety, Attack Preference, Simplification Preference, and Time Pressure Behavior.

## 20. Model Training
Triggers via `/api/v1/train`:
- Splits user position samples into 80/20 train/validation sets.
- Trains PyTorch model across 15 epochs using Adam optimizer and CrossEntropy loss.
- Saves model artifacts to `ml-service/artifacts/{userId}_{modelType}_v1.pt`.

## 21. Model Evaluation
Computes top-1 accuracy, top-3 accuracy, validation loss, and sample counts. Metrics are stored in the `MLModelVersion` database record.

## 22. Model Versioning
Supports versioning (`v1`, `v2`, `v3`) with statuses:
`NOT_AVAILABLE`, `INSUFFICIENT_DATA`, `DATASET_GENERATING`, `TRAINING`, `VALIDATING`, `READY`, `FAILED`.

## 23. AI Arena
Public community platform for discovering and playing against AI models of other users:
- Visibility controls: `PRIVATE`, `DISCOVERABLE`, `PUBLIC`.
- Shields private games, raw training data, and model binaries.

## 24. API Documentation
Swagger OpenAPI documentation is available live at:
`http://localhost:5000/api/docs`

## 25. Environment Variables
Copy `.env.example` to `.env` and fill in Supabase and Database connection strings.

## 26. Local Development
Start Redis, Python ML Service, Express Backend, and Vite Frontend:
```bash
# Backend
cd backend && npm run dev

# ML Service
cd ml-service && python run.py

# Frontend
cd frontend && npm run dev
```

## 27. Database Migration
```bash
cd backend
npx prisma db push --schema=../prisma/schema.prisma
```

## 28. Background Workers
Background sync workers run automatically within the backend process or via Docker containers.

## 29. Running Frontend
```bash
cd frontend
npm run dev
```
Accessible at `http://localhost:3000`.

## 30. Running Backend
```bash
cd backend
npm run dev
```
Accessible at `http://localhost:5000`.

## 31. Running ML Service
```bash
cd ml-service
python run.py
```
Accessible at `http://localhost:8000`.

## 32. Testing
Run unit and data isolation test suite:
```bash
cd backend
npm test
```

## 33. Deployment
- **Frontend**: Vercel / Netlify
- **Backend**: Render / Railway
- **ML Service**: Railway / Docker Cloud
- **Database & Auth**: Supabase

## 34. Security
- Supabase JWT validation on every protected route.
- Ownership checks on game IDs, DNA records, and play sessions.
- Private model binary protection.
- Service role key kept strictly on server.

## 35. Troubleshooting
- **Sync stuck**: Check network connectivity to Chess.com API.
- **ML Service offline**: Ensure PyTorch and FastAPI dependencies are installed (`pip install -r ml-service/requirements.txt`).
- **Prisma Client error**: Run `npx prisma generate --schema=../prisma/schema.prisma`.

## 36. Data Flow
`Supabase Auth -> User UUID -> Connected Chess.com Profile -> Games -> Stockfish Analysis -> Chess DNA -> PyTorch Models -> Play & Arena`

## 37. Synchronization Flow
`User Connects -> Verify Profile -> Fetch Archives -> Import Games -> Analyze Positions -> Generate DNA -> Train Models -> Ready`

## 38. Model Lifecycle
`INSUFFICIENT_DATA -> DATASET_GENERATING -> TRAINING -> VALIDATING -> READY`

## 39. AI Arena Lifecycle
`User Profile -> Public Visibility -> Discoverable Model -> Challenge Session -> Legal Move Engine -> Live Gameplay`

## 40. Project Structure
```text
Chess_Evolve/
├── frontend/          # React + Vite + Tailwind CSS + React Chessboard + Recharts
├── backend/           # Express + TypeScript + Prisma + Supabase Auth + Stockfish
├── ml-service/        # Python FastAPI + PyTorch Candidate Move Ranker
├── prisma/            # PostgreSQL Database Schema
├── .env.example       # Environment Variables Template
├── docker-compose.yml # Docker Local Orchestration
└── README.md          # Architecture & Documentation Guide
```
