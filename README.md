# ♟️ Chess Evolve - AI Chess Evolution Laboratory

> **Meet the chess player you're becoming.**  
> An intelligent chess analysis and evolutionary training platform that syncs your Chess.com profile, extracts your 7-dimensional **Chess DNA**, and lets you play against your custom **Peak Self AI opponent**.

---

## 🌟 Overview

**Chess Evolve** is a full-stack, AI-driven chess performance laboratory designed to help players break through rating plateaus. Unlike generic chess engines or standard bot opponents, Chess Evolve measures your unique playing style, uncovers recurring tactical & positional weaknesses, and constructs a customized AI opponent (**Peak Self**) that mirrors your exact playing style while eliminating your blunders.

---

## ✨ Key Features

### 1. 🔄 Chess.com Seamless Profile Sync
- Import complete available game history from public Chess.com profiles.
- Automatic PGN parsing, game accuracy calculations, opening ECO classification, and move-by-move evaluation indexing.

### 2. 🧬 7-Dimensional Chess DNA
Extracts a personalized style radar across 7 core playing dimensions:
- **Aggression** & King Attack Focus
- **Risk Tolerance** & Tactical Volatility
- **Tactical Preference** vs. **Positional Preference**
- **Defensive Resilience**
- **Endgame Conversion** Rate
- **Sacrifice Tendency**

### 3. ⚔️ Peak Self AI Opponent
- **Current Self AI**: Spar against an AI bot tuned to match your current playing style metrics.
- **Peak Self AI**: Play against an upgraded representation of yourself—eliminating your blunders, punishing your common mistakes, and showing you how to reach your peak potential.

### 4. 🎯 Tailored Weakness Lab & Puzzle Training
- Automatically generates targeted puzzle sessions derived directly from blunders and missed tactics in your own games.
- Real-time evaluation feedback using integrated Stockfish engine depth.

### 5. 🤖 AI Coach & Game Analysis
- Deep game review with move accuracy, blunder/mistake categorization, and interactive board playback.
- Stockfish evaluation graph paired with AI coaching commentary to explain key critical moments.

### 6. 📈 Evolutionary Dashboard
- Track rating progression, game frequency, DNA version history, and skill evolution over time.

---

## 🛠️ Tech Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS (Custom Premium Black Dark UI), Lucide Icons, Recharts, `react-chessboard`, Framer Motion |
| **Backend** | Node.js, Express.js, Prisma ORM, Zod Validation, JWT Authentication, CORS, Swagger (`swagger-ui-express`) |
| **Database** | SQLite (Default for quick local setup) / PostgreSQL (Supported via Prisma) |
| **Chess Engine & APIs** | Stockfish Engine (WASM/CLI bindings via `chess.js` & `stockfish`), Chess.com Public REST API |

---

## 📁 Repository Structure

```text
Chess_Evolve/
├── client/                     # Frontend Vite + React Application
│   ├── src/
│   │   ├── components/         # Reusable UI Components (Navbar, Modals, Board, etc.)
│   │   ├── context/            # Auth & Application State Providers
│   │   ├── pages/              # Main App Views (Landing, Dashboard, ChessDNA, Play, Training, etc.)
│   │   ├── services/           # Axios / API Client configuration
│   │   ├── index.css           # Global Tailwind CSS Styles & Custom Theme Tokens
│   │   └── App.jsx             # Main Router & View Controller
│   ├── tailwind.config.js      # Tailwind CSS Theme & Color Palette Definitions
│   └── package.json
│
├── server/                     # Backend Express.js API & Chess Engine Services
│   ├── prisma/                 # Database Schema & Migrations (SQLite / Postgres)
│   ├── src/
│   │   ├── db/                 # Prisma Client Connection & Seed Scripts
│   │   ├── routes/             # API Endpoints (auth, sync, dna, play, training, coach, etc.)
│   │   ├── services/           # Engine Analysis, Chess.com Integration, Peak Self AI Tuning
│   │   └── index.js            # Express Server Entrypoint & Middleware Setup
│   └── package.json
│
├── .env.example                # Template for Environment Variables
├── package.json                # Monorepo / Root Script Runner
└── README.md                   # Project Documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
Make sure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **npm**: `v9.0.0` or higher (comes bundled with Node.js)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/YourUsername/Chess_Evolve.git
cd Chess_Evolve
```

---

### Step 2: Install All Dependencies
Install dependencies for the root monorepo runner, backend server, and frontend client in one command:
```bash
npm run install:all
```
*(Alternatively, run `npm install` inside both `server/` and `client/` directories).*

---

### Step 3: Environment Setup
Create a `.env` file in the root directory (or inside `server/`) based on `.env.example`:

```bash
# Backend Configuration
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="your_custom_secure_jwt_secret_key_here"
NODE_ENV="development"

# Optional: OpenAI API Key for advanced natural language coach explanations
OPENAI_API_KEY=""
```

---

### Step 4: Initialize the Database
Generate the Prisma client and push the schema to create your local database:

```bash
cd server
npm run db:generate
npm run db:push
```

*(Optional) Seed default test profiles and sample games:*
```bash
npm run db:seed
```

---

### Step 5: Start Development Servers

Return to the root directory and launch backend and frontend concurrently:

#### Option A: Run concurrently from root
```bash
# Terminal 1: Launch Backend API Server (Port 5000)
npm run dev:server

# Terminal 2: Launch Frontend Client (Port 5173)
npm run dev:client
```

#### Option B: Run from individual folders
```bash
# Backend (Server)
cd server
npm run dev

# Frontend (Client)
cd client
npm run dev
```

---

### Step 6: Access the Application
Open your browser and navigate to:
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Interactive API Swagger Docs**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

---

## 🎮 How to Use Chess Evolve

1. **Register / Sign In**: Create an account on the application.
2. **Connect Chess.com Profile**: Click **Connect Chess.com** and enter any public Chess.com username (e.g., `hikaru`, `magnuscarlsen`, or your own username).
3. **Trigger Profile Sync**: The system fetches game archives, imports PGNs, parses move evaluations, and calculates your preliminary metrics.
4. **Explore Chess DNA**: Head over to the **Chess DNA** tab to view your 7-dimensional style radar chart, top strengths, and flagged weakness patterns.
5. **Spar with Peak Self**: Select the **Play** tab, choose **Peak Self Opponent**, and experience playing against an upgraded version of your own game style.
6. **Train in Weakness Lab**: Tackle tailored puzzles in the **Training** tab to patch tactical lapses identified from your own games.

---

## 🗄️ Database Schema Summary

The core data model managed via Prisma includes:
- **User**: Authentication details, user preferences, and relations.
- **ChessProfile**: Linked Chess.com profile metrics, sync timestamps, and total games imported.
- **Game & Move**: Parsed move histories, FEN strings, ECO codes, and move accuracies.
- **GameAnalysis**: Move evaluations, accuracy breakdown, blunder/mistake counts.
- **ChessDNAVersion**: Historical snapshots of 7D style radar metrics and weakness classifications.
- **PeakSelfVersion**: Engine tuning parameters (search depth, aggression multipliers, blunder filters) matched to DNA versions.
- **PlaySession & TrainingSession**: Records of active/completed games against Peak Self and completed puzzle training sessions.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p center="text-center">
  Made with ❤️ for chess enthusiasts & AI learners worldwide.
</p>
