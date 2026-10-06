import { Router } from "express";
import { prisma } from "../utils/prisma.js";
import { getRedisClient } from "../utils/redis.js";
import { StockfishService } from "../services/stockfish/StockfishService.js";
import axios from "axios";

const router = Router();

// GET /health - Process liveness probe
router.get("/health", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "chess-evolve-backend",
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// GET /ready - Deep dependency readiness probe
router.get("/ready", async (_req, res) => {
  const checks = {
    database: "unknown",
    redis: "unknown",
    mlService: "unknown",
    stockfish: "unknown",
  };

  let allHealthy = true;

  // 1. Database readiness check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "healthy";
  } catch (err) {
    checks.database = "unhealthy";
    allHealthy = false;
  }

  // 2. Redis readiness check
  try {
    const redis = getRedisClient();
    if (redis) {
      const pingPromise = redis.ping();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis ping timeout")), 1500)
      );
      const pong = await Promise.race([pingPromise, timeoutPromise]);
      checks.redis = pong === "PONG" ? "healthy" : "degraded";
    } else {
      checks.redis = "unconfigured";
    }
  } catch {
    checks.redis = "unreachable";
  }

  // 3. ML Service readiness check
  try {
    const mlUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const mlRes = await axios.get(`${mlUrl}/health`, { timeout: 3000 });
    checks.mlService = mlRes.status === 200 ? "healthy" : "unhealthy";
  } catch {
    checks.mlService = "unreachable";
    allHealthy = false;
  }

  // 4. Stockfish binary availability
  try {
    const sfAvailable = await StockfishService.isAvailable();
    checks.stockfish = sfAvailable ? "healthy" : "unavailable";
  } catch {
    checks.stockfish = "unavailable";
  }

  const statusCode = allHealthy ? 200 : 503;
  return res.status(statusCode).json({
    status: allHealthy ? "ready" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
