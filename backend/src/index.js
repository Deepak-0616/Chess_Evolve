import express from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";

import { securityHeaders, configureCors } from "./middleware/securityHeaders.js";
import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import {
  generalLimiter,
  syncLimiter,
  trainingLimiter,
  coachLimiter,
} from "./middleware/rateLimiter.js";

import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import chessRoutes from "./routes/chess.js";
import gamesRoutes from "./routes/games.js";
import dnaRoutes from "./routes/dna.js";
import modelsRoutes from "./routes/models.js";
import playRoutes from "./routes/play.js";
import arenaRoutes from "./routes/arena.js";
import trainingRoutes from "./routes/training.js";
import coachRoutes from "./routes/coach.js";
import profileRoutes from "./routes/profile.js";
import stockfishRoutes from "./routes/stockfish.js";
import featuresRoutes from "./routes/features.js";
import datasetsRoutes from "./routes/datasets.js";
import evolutionRoutes from "./routes/evolution.js";
import retrainingRoutes from "./routes/retraining.js";

import { disconnectPrisma } from "./utils/prisma.js";
import { closeRedis } from "./utils/redis.js";
import { validateEnv } from "./config/env.js";

dotenv.config();
validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Security Headers, Compression & CORS
app.use(securityHeaders);
app.use(compression());
app.use(cors(configureCors()));

// 2. Body Parsing & Logging
app.use(express.json({ limit: "10mb" }));
app.use(requestLogger);

// 3. Swagger OpenAPI documentation spec
const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Chess Evolve Production API",
    version: "1.0.0",
    description:
      "Production-hardened real-time multi-user AI Chess synchronization, Stockfish position evaluation, Chess DNA, and PyTorch model API",
  },
  servers: [{ url: "/api/v1" }],
};

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 4. Health and Readiness Routes (Root and API v1)
app.use("/", healthRoutes);
app.use("/api/v1", healthRoutes);

// 5. Global Rate Limiter
app.use("/api/v1", generalLimiter);

// 6. Register Domain API v1 routes with targeted protections
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/chess/sync", syncLimiter);
app.use("/api/v1/chess", chessRoutes);
app.use("/api/v1/games", gamesRoutes);
app.use("/api/v1/dna", dnaRoutes);

app.use("/api/v1/models/current-self/train", trainingLimiter);
app.use("/api/v1/models/peak-self/train", trainingLimiter);
app.use("/api/v1/models/rollback", trainingLimiter);
app.use("/api/v1/models", modelsRoutes);

app.use("/api/v1/play", playRoutes);
app.use("/api/v1/arena", arenaRoutes);
app.use("/api/v1/training", trainingRoutes);

app.use("/api/v1/coach/chat", coachLimiter);
app.use("/api/v1/coach", coachRoutes);

app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/stockfish", stockfishRoutes);

app.use("/api/v1/ml/features/generate", trainingLimiter);
app.use("/api/v1/ml/features", featuresRoutes);

app.use("/api/v1/ml/datasets/generate", trainingLimiter);
app.use("/api/v1/ml/datasets", datasetsRoutes);

app.use("/api/v1/evolution", evolutionRoutes);

app.use("/api/v1/models/retrain/trigger", trainingLimiter);
app.use("/api/v1/models/retrain", retrainingRoutes);

// 7. Global 404 handler for undefined endpoints
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "ENDPOINT_NOT_FOUND",
      message: `The requested endpoint '${req.method} ${req.originalUrl}' does not exist.`,
      requestId: req.requestId || "req_unknown",
    },
  });
});

// 8. Centralized Safe Error Handler
app.use(errorHandler);

let server = null;

if (process.env.NODE_ENV !== "test") {
  server = app.listen(PORT, () => {
    console.log(`🚀 Chess Evolve Backend listening on port ${PORT}`);
    console.log(
      `📖 API Documentation available at http://localhost:${PORT}/api/docs`,
    );
  });
}

// 9. Graceful Shutdown Management
async function gracefulShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
  if (server) {
    server.close(() => {
      console.log("[Server] HTTP server stopped accepting connections.");
    });
  }

  try {
    await disconnectPrisma();
    await closeRedis();
    console.log("[Server] All external connections released cleanly.");
    process.exit(0);
  } catch (err) {
    console.error("[Server] Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;
