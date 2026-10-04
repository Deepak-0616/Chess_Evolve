import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";

import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/chessProfile.js";
import userProfileRoutes from "./routes/profile.js";
import syncRoutes from "./routes/sync.js";
import gamesRoutes from "./routes/games.js";
import dnaRoutes from "./routes/dna.js";
import peakSelfRoutes from "./routes/peakSelf.js";
import playRoutes from "./routes/play.js";
import arenaRoutes from "./routes/arena.js";
import trainingRoutes from "./routes/training.js";
import coachRoutes from "./routes/coach.js";
import dashboardRoutes from "./routes/dashboard.js";
import evolutionRoutes from "./routes/evolution.js";
import modelsRoutes from "./routes/models.js";

import { openApiSpec } from "./utils/swagger.js";
import { sendError } from "./utils/apiResponse.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

// OpenAPI Documentation
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Mount Models & ML Service routes
app.use("/api", modelsRoutes);

// Versioned API Routes (/api/v1)
const v1 = express.Router();

v1.use("/auth", authRoutes);
v1.use("/chess/profile", profileRoutes);
v1.use("/profile", userProfileRoutes);
v1.use("/chess/sync", syncRoutes);
v1.use("/games", gamesRoutes);
v1.use("/dna", dnaRoutes);
v1.use("/peak-self", peakSelfRoutes);
v1.use("/play", playRoutes);
v1.use("/arena", arenaRoutes);
v1.use("/training", trainingRoutes);
v1.use("/coach", coachRoutes);
v1.use("/dashboard", dashboardRoutes);
v1.use("/evolution", evolutionRoutes);

app.use("/api/v1", v1);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Fallback 404
app.use((req, res) => {
  sendError(res, "RESOURCE_NOT_FOUND", "The requested endpoint was not found.", 404);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  sendError(res, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.", 500);
});

app.listen(PORT, () => {
  console.log(`⚡ Chess Evolve API Server running on port ${PORT}`);
  console.log(`📖 OpenAPI Specs available at http://localhost:${PORT}/api/docs`);
});
