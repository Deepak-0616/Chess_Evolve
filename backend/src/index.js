import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";

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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Swagger OpenAPI documentation spec
const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Chess Evolve Production API",
    version: "1.0.0",
    description:
      "Real-time multi-user AI Chess synchronization, Stockfish position evaluation, Chess DNA, and PyTorch model API",
  },
  servers: [{ url: "/api/v1" }],
};

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date(),
    service: "Chess Evolve Express Backend",
  });
});

// Register API v1 routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/chess", chessRoutes);
app.use("/api/v1/games", gamesRoutes);
app.use("/api/v1/dna", dnaRoutes);
app.use("/api/v1/models", modelsRoutes);
app.use("/api/v1/play", playRoutes);
app.use("/api/v1/arena", arenaRoutes);
app.use("/api/v1/training", trainingRoutes);
app.use("/api/v1/coach", coachRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/stockfish", stockfishRoutes);
app.use("/api/v1/ml/features", featuresRoutes);
app.use("/api/v1/ml/datasets", datasetsRoutes);
app.use("/api/v1/evolution", evolutionRoutes);

// Global 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Chess Evolve Backend listening on port ${PORT}`);
  console.log(
    `📖 API Documentation available at http://localhost:${PORT}/api/docs`,
  );
});

export default app;
