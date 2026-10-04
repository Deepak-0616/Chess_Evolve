# ♟️ CHESS EVOLVE

> **Meet the chess player you're becoming.**

Chess Evolve is a full-stack, AI-driven personalized chess intelligence platform. It learns an individual player's chess identity from their publicly available Chess.com game history and constructs two personalized AI models: **Current Self** (how the player actually plays right now) and **Peak Self** (a stronger version of the same player that preserves their recognizable style while reducing recurring mistakes).

---

## 1. Project Overview

Chess Evolve is built as a complete AI Full-Stack web application. It transforms raw historical PGN game archives into structured feature matrices, multidimensional Chess DNA metrics, and personalized PyTorch machine-learning models.

The system connects real database state, Stockfish engine evaluations, dedicated PyTorch ranking models, and interactive chessboard UI components across a complete end-to-end user pipeline.

---

## 2. Problem Statement

Generic chess engines (such as standard Stockfish, Komodo, or Leela Chess Zero) play at super-human levels but lack personal identity. Playing against generic bots at fixed elo ratings (e.g. 1500 bot) feels artificial because they alternate between grandmaster moves and intentional random blunders.

Furthermore, traditional chess analysis tells players *what* the engine would do, but fails to explain *how a stronger version of the player themselves* would navigate the position while keeping their preferred openings, attacking style, and tactical intuition.

Chess Evolve solves this by constructing personalized chess models trained directly on the player's historical game positions.

---

## 3. Product Vision

> **Meet the chess player you're becoming.**

Chess Evolve acts as a personal chess laboratory where every user's chess history becomes the foundation for an evolving AI identity:

```text
Current Player Style
        +
Better Decision Making
        +
Weakness Correction
        ↓
Peak Self
```

---

## 4. Core Features

1. **Supabase Auth & Google OAuth**: Production authentication supporting Google login and JWT session validation.
2. **Chess.com Profile Connection & Sync**: Incremental game synchronization discovering archives, fetching PGNs, parsing moves, and calculating accuracy.
3. **13-Dimensional Chess DNA**: Data-driven calculation of Aggression, Risk Taking, Tactical Preference, Positional Preference, Defensive Ability, Sacrifice Tendency, Trading Tendency, Opening Diversity, Endgame Ability, Time Pressure Behavior, King Safety Preference, Attack Preference, and Simplification Preference.
4. **Current Self ML Model**: Dedicated PyTorch candidate-move ranking model predicting $P(\text{player move} \mid \text{position, behavior})$.
5. **Peak Self ML Model**: Dedicated PyTorch model balancing Engine Quality, Style Compatibility, and Weakness Correction.
6. **Personal Play Mode**: Play interactive games against your Current Self or Peak Self with real-time legal move validation and asynchronous bot inference.
7. **Post-Game Stockfish Analysis**: Move accuracy, blunder/mistake/inaccuracy classification, and critical moment detection.
8. **AI Arena**: Public AI profile discovery allowing users to search and play against other players' Current Self and Peak Self models with independent Elo ratings.
9. **Personalized Training**: Puzzle sessions generated directly from the user's historical blunders and weak positions.
10. **Grounded AI Coach**: Interactive coach providing grounded explanations based on real database records.
11. **Visual Evolution Timeline**: Detailed tracking of Chess DNA versions, rating growth, and model accuracy over time.

---

## 5. User Journey

```text
Landing Page
      ↓
Google Login
      ↓
Account Created
      ↓
Connect Chess.com Username
      ↓
Verify Chess.com Profile
      ↓
Import Public Game History
      ↓
Analyze Games with Stockfish
      ↓
Generate Chess DNA Version
      ↓
Generate Training Dataset
      ↓
Train Current Self PyTorch Model
      ↓
Train Peak Self PyTorch Model
      ↓
Dashboard & Personal AI Lab
      ↓
Play / Analyze / Train / Evolve
      ↓
AI Arena (Play Other Players' AI)
```

---

## 6. Current Self

### Objective
Replicate the player's actual decision-making style, preferences, risks, tactical behavior, positional choices, opening preferences, and recurring patterns.

### Training Strategy & Dataset
For each historical position in the user's games:
1. Extract board state and position features (material balance, pawn structure, king safety, game phase).
2. Generate candidate moves using Stockfish.
3. Extract candidate features (eval rank, centipawn loss, capture, check, sacrifice, attack).
4. Combine position features, candidate move features, and player Chess DNA.
5. Train a PyTorch ranking network to predict candidate move selection probabilities: $P(\text{player chooses candidate move} \mid \text{position, behavior})$.

### Evaluation Metrics
Evaluated on held-out test games:
- Top-1 Accuracy
- Top-3 Accuracy
- Precision, Recall, F1 Score
- Behavioral Similarity Index

---

## 7. Peak Self

### Objective
Preserve the player's recognizable style while reducing recurring mistakes and making stronger decisions. Peak Self does NOT simply equal Stockfish.

### Training Strategy & Target Generation
For each historical position:
$$\text{PeakScore} = w_1 \cdot \text{EngineQuality} + w_2 \cdot \text{StyleCompatibility} + w_3 \cdot \text{WeaknessCorrection}$$

- **EngineQuality**: Centipawn evaluation quality from Stockfish.
- **StyleCompatibility**: Model probability from Current Self model.
- **WeaknessCorrection**: Penalty reduction for moves falling into the player's identified blunder patterns.

---

## 8. Why Current Self and Peak Self Are Separate

Current Self answers:
> *"How would I normally play this position?"*

Peak Self answers:
> *"How would a stronger version of me play this position while preserving my identity?"*

Merging them or using a single engine with different prompt text fails to model the distinction between behavior prediction and style-conditioned decision enhancement.

---

## 9. Stockfish

Stockfish is used purely as a chess calculation and evaluation engine:
- Evaluating board positions (centipawns / mate).
- Generating top K candidate moves.
- Calculating centipawn loss (CPL) per move.
- Detecting blunders (>150 CPL), mistakes (50-150 CPL), and inaccuracies (20-50 CPL).

Stockfish is NOT treated as Current Self or Peak Self. Stockfish candidates serve as input features to the personalized ML models.

---

## 10. Chess DNA

Chess DNA metrics are calculated from actual game data across 13 dimensions:

```text
1. Aggression               : Pawn pushes, early queen moves, checks, king attacks
2. Risk Taking             : Sharp tactical lines, uncastled king, material sacrifices
3. Tactical Preference     : Captures, checks, tactical shots vs positional moves
4. Positional Preference   : Structure preservation, piece activity, open files
5. Defensive Ability       : CPL performance in passive or defensive positions
6. Sacrifice Tendency      : Frequency of giving up material for initiative
7. Trading Tendency        : Piece exchange frequency
8. Opening Diversity       : Unique openings played across white and black
9. Endgame Ability         : CPL performance in positions with <= 6 pieces
10. Time Pressure Behavior : Accuracy drop during fast time control moves
11. King Safety Preference : Frequency of early castling and pawn shields
12. Attack Preference      : Direct pawn and piece storms towards enemy king
13. Simplification Preference: Transitioning into simplified endgames when ahead
```

---

## 11. Chess.com Integration

Uses Chess.com PubAPI (`https://api.chess.com/pub/`):
- `GET /pub/player/{username}`: Profile verification, title, avatar, country, join date.
- `GET /pub/player/{username}/stats`: Rapid, blitz, bullet ratings.
- `GET /pub/player/{username}/games/archives`: Discovers monthly archive URLs.
- `GET /pub/player/{username}/games/{yyyy}/{mm}`: Monthly game archives, PGNs, move timestamps, player ratings, results, ECO.

Features incremental synchronization to avoid re-downloading existing games based on unique external IDs.

---

## 12. AI Arena

AI Arena allows users to discover and play against other players' trained AI models:
- **Sharing Settings**: `PRIVATE` (owner only), `DISCOVERABLE` (shows in search), `PUBLIC` (open to play).
- **Independent AI Rating**: Separate Elo ratings for Current Self and Peak Self based on games played against them.
- **Privacy Enforcement**: Server-side ownership checks ensure raw training datasets, private games, and model files are never exposed to other users.

---

## 13. System Architecture

```text
                               ┌─────────────────────────┐
                               │   Supabase Auth & OAuth │
                               └────────────┬────────────┘
                                            │
┌─────────────────────────┐    ┌────────────▼────────────┐    ┌─────────────────────────┐
│   React 19 Frontend     │───►│  Express API Server     │───►│   Prisma PostgreSQL     │
│   (Vite + Tailwind)     │◄───│  (Node.js / REST API)   │◄───│   Database             │
└─────────────────────────┘    └────────────┬────────────┘    └─────────────────────────┘
                                            │
                               ┌────────────┼────────────┐
                               │            │            │
                               ▼            ▼            ▼
                        ┌─────────────┐ ┌────────┐ ┌─────────────┐
                        │ Chess.com   │ │ Stock  │ │ PyTorch ML  │
                        │ PubAPI      │ │ fish   │ │ Service     │
                        └─────────────┘ └────────┘ └─────────────┘
```

---

## 14. Frontend Architecture

Built with React 19, Vite, Tailwind CSS, Recharts, `react-chessboard`, and Lucide Icons.
- `src/components/`: Navbar, AuthModal, ConnectModal, Chessboard wrapper.
- `src/context/`: AuthContext managing Supabase JWT and user state.
- `src/pages/`: Landing, Dashboard, Play, MyAI, ChessDNA, Training, Evolution, AIArena, UserProfile, GameAnalysis, GameHistory, AICoach.
- `src/services/`: ApiClient and Supabase client.

---

## 15. Backend Architecture

Built with Express.js and Prisma ORM:
- `src/middleware/auth.js`: Validates Supabase JWT, resolves/provisions database user.
- `src/routes/`: `auth`, `chessProfile`, `profile`, `sync`, `games`, `dna`, `peakSelf`, `play`, `arena`, `training`, `coach`, `dashboard`, `evolution`, `models`.
- `src/services/`: Engine service, Chess.com service, DNA calculator, ML service, play session manager.

---

## 16. ML Architecture

Built with Python FastAPI + PyTorch:
- `ml-service/app/features/extractor.py`: Unified feature engineering module.
- `ml-service/app/models/current_self.py`: Candidate move probability network.
- `ml-service/app/models/peak_self.py`: Style-compatible decision enhancement network.
- `ml-service/app/main.py`: Internal FastAPI REST service (`/internal/ml/*`).

---

## 17. Database Architecture

Prisma PostgreSQL schema containing:
- `User` & `ChessProfile`
- `Game`, `Move`, `GameAnalysis`
- `ChessDNAVersion`, `Weakness`
- `MLModelVersion`, `PeakSelfVersion`
- `PlaySession`, `PlayMove`
- `TrainingSession`, `TrainingAttempt`
- `EvolutionEvent`, `SyncJob`

---

## 18. Authentication

Uses Supabase Auth with Google OAuth:
1. User logs in via Google on frontend using Supabase Auth.
2. Supabase issues JWT access token.
3. Token sent in `Authorization: Bearer <JWT>` header to Express backend.
4. Backend middleware validates token, checks `sub`/email, and resolves `User` record in PostgreSQL database.

---

## 19. Background Jobs

Async background job manager handles long-running tasks:
- `CHESS_PROFILE_SYNC`
- `GAME_IMPORT`
- `STOCKFISH_ANALYSIS`
- `DNA_GENERATION`
- `MODEL_TRAINING`

Job statuses: `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`.

---

## 20. API Documentation

Interactive OpenAPI / Swagger documentation exposed at:
```http
GET http://localhost:5000/api/docs
```

---

## 21. Environment Variables

Create `.env` in `server/`:

```env
PORT=5000
DATABASE_URL="file:./dev.db"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
JWT_SECRET="chess_evolve_secret_key"
ML_SERVICE_URL="http://localhost:8000"
```

Create `.env` in `client/`:

```env
VITE_API_BASE="http://localhost:5000/api/v1"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

---

## 22. Local Development Setup

### 1. Install Dependencies
```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install

# Python ML Service dependencies
cd ../ml-service
pip install -r requirements.txt
```

---

## 23. Supabase Setup

1. Create a project at [Supabase](https://supabase.com).
2. Enable Google Provider under Authentication -> Providers.
3. Set Site URL & Redirect URLs to `http://localhost:5173`.
4. Copy Project URL and Anon Key into `.env` files.

---

## 24. Chess.com Setup

No private API keys required. Integration uses Chess.com's public PubAPI (`https://api.chess.com/pub/`).

---

## 25. Stockfish Setup

Uses `stockfish` NPM package with JavaScript/WASM worker bindings. Runs cross-platform on Windows, macOS, and Linux without external binary compilation required.

---

## 26. ML Environment

Python 3.10+ environment with PyTorch, FastAPI, Uvicorn, NumPy, Pydantic.

---

## 27. Redis Setup

Redis url configurable in `REDIS_URL` for BullMQ queues in production.

---

## 28. Database Migration

```bash
cd server
npx prisma generate
npx prisma db push
```

---

## 29. Training Models

To train models via API:
```bash
# Current Self Training
POST http://localhost:5000/api/v1/models/current-self/train

# Peak Self Training
POST http://localhost:5000/api/v1/models/peak-self/train
```

---

## 30. Running the Full System

### Start Express Backend Server
```bash
cd server
npm run dev
```

### Start React Frontend
```bash
cd client
npm run dev
```

### Start Python ML Service (Optional Microservice Mode)
```bash
cd ml-service
uvicorn app.main:app --port 8000 --reload
```

---

## 31. Testing

### Run Client Build Test
```bash
cd client
npm run build
```

---

## 32. Deployment

- **Frontend**: Vercel / Netlify
- **Backend API**: Render / Railway / AWS ECS
- **Database**: Supabase PostgreSQL
- **ML Service**: Render / AWS EC2 with PyTorch

---

## 33. Security

- Server-side JWT verification on all protected endpoints.
- Server-side ownership checks (`where: { userId }`).
- Input validation using Zod schemas.
- CORS restricted headers.

---

## 34. Troubleshooting

- **Database Connection Error**: Run `npx prisma db push` inside `server/`.
- **Chess.com Profile Not Found**: Ensure exact username spelling.
- **Build Failures**: Run `npm install` in `client/` and `server/`.

---

## 35. Project Structure

```text
Chess_Evolve/
├── client/                     # React 19 Frontend
│   ├── src/
│   │   ├── components/         # Navbar, Modals, Board UI
│   │   ├── context/            # AuthContext & Session State
│   │   ├── pages/              # Landing, Dashboard, Play, MyAI, ChessDNA, Training, Evolution, AIArena, UserProfile, Coach, GameAnalysis, GameHistory
│   │   ├── services/           # ApiClient & Supabase Client
│   │   └── App.jsx
├── server/                     # Express Backend
│   ├── prisma/                 # Prisma Schema & Database Models
│   ├── src/
│   │   ├── middleware/         # Supabase Auth Middleware
│   │   ├── routes/             # REST Endpoints
│   │   ├── services/           # Engine, DNA, ML, Play, Coach Services
│   │   └── index.js
├── ml-service/                 # PyTorch ML Microservice
│   ├── app/
│   │   ├── features/           # Feature Engineering
│   │   ├── models/             # PyTorch CurrentSelf & PeakSelf Networks
│   │   └── main.py             # FastAPI App
└── README.md
```

---

## 36. Data Flow

```text
Chess.com PubAPI
      ↓
Game Archives & PGNs
      ↓
Prisma Database Storage
      ↓
Stockfish Move Analysis
      ↓
13D Chess DNA Extraction
      ↓
Feature Matrix Generation
      ↓
PyTorch Current & Peak Self Models
      ↓
Interactive Gameplay & AI Arena
```

---

## 37. Model Lifecycle

```text
Import Games → Stockfish Analysis → Dataset Generation → PyTorch Training → Metric Validation → Artifact Deployment → Gameplay Inference → Evolution Retraining
```

---

## 38. AI Arena Lifecycle

```text
User Profile → Set AI Visibility (Public/Discoverable) → Search AI Arena → Open Player AI Profile → Start Game Session → Model Inference → Record Game Result & Update Elo
```

---

## 39. Future Extensions

- Real-time WebSocket multi-user sparring sessions.
- Opening repertoire tree visualization matching player DNA.
- Deep engine multi-PV exploration mode.
