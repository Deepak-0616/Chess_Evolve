import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { TrainingService } from "../services/training/trainingService.js";

const router = Router();

// In-memory training cache for ultra-fast training views (<2ms)
const trainingCache = new Map();
export const invalidateTrainingCache = (userId) => {
  if (userId) {
    for (const key of trainingCache.keys()) {
      if (key.startsWith(`${userId}_`)) trainingCache.delete(key);
    }
  } else {
    trainingCache.clear();
  }
};

// All training endpoints require authentic Supabase JWT
router.use(authenticateSupabaseUser);

/**
 * GET /api/v1/training/overview
 * Returns user's active training plan, streak, weaknesses, recent sessions, and data availability.
 */
router.get("/overview", async (req, res) => {
  try {
    const cacheKey = `${req.user.id}_overview`;
    const cached = trainingCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return res.json(cached.payload);

    const data = await TrainingService.getOverview(req.user.id);
    trainingCache.set(cacheKey, { payload: data, expiresAt: Date.now() + 30000 });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch training overview", details: err.message });
  }
});

/**
 * GET /api/v1/training/plan
 * Returns user's active personalized training plan
 */
router.get("/plan", async (req, res) => {
  try {
    const cacheKey = `${req.user.id}_plan`;
    const cached = trainingCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return res.json(cached.payload);

    const overview = await TrainingService.getOverview(req.user.id);
    if (!overview.sufficientData) {
      const payload = { plan: null, sufficientData: false, message: overview.message };
      trainingCache.set(cacheKey, { payload, expiresAt: Date.now() + 30000 });
      return res.status(200).json(payload);
    }
    const payload = { plan: overview.activePlan, sufficientData: true };
    trainingCache.set(cacheKey, { payload, expiresAt: Date.now() + 30000 });
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch training plan", details: err.message });
  }
});

/**
 * GET /api/v1/training/weaknesses
 * Returns user's real recurring weaknesses with evidence from analyzed games
 */
router.get("/weaknesses", async (req, res) => {
  try {
    const cacheKey = `${req.user.id}_weaknesses`;
    const cached = trainingCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return res.json(cached.payload);

    const data = await TrainingService.getWeaknesses(req.user.id);
    trainingCache.set(cacheKey, { payload: data, expiresAt: Date.now() + 30000 });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch weaknesses", details: err.message });
  }
});

/**
 * GET /api/v1/training/progress
 * Returns user's aggregate training statistics, category performance, and difficulty
 */
router.get("/progress", async (req, res) => {
  try {
    const cacheKey = `${req.user.id}_progress`;
    const cached = trainingCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return res.json(cached.payload);

    const data = await TrainingService.getProgress(req.user.id);
    trainingCache.set(cacheKey, { payload: data, expiresAt: Date.now() + 30000 });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch training progress", details: err.message });
  }
});

/**
 * POST /api/v1/training/sessions
 * Start a new training session with real positions from user's games
 */
router.post("/sessions", async (req, res) => {
  try {
    invalidateTrainingCache(req.user.id);
    const { category, difficulty, targetWeakness, planId } = req.body || {};
    const sessionData = await TrainingService.createSession(req.user.id, {
      category,
      difficulty,
      targetWeakness,
      planId,
    });
    return res.status(201).json(sessionData);
  } catch (err) {
    return res.status(400).json({ error: "Failed to create training session", details: err.message });
  }
});

/**
 * GET /api/v1/training/sessions/:sessionId
 * Fetch a training session (unattempted positions are sanitized — no answers leaked)
 */
router.get("/sessions/:sessionId", async (req, res) => {
  try {
    const sessionData = await TrainingService.getSession(req.user.id, req.params.sessionId);
    return res.json(sessionData);
  } catch (err) {
    const status = err.message.includes("unauthorized") || err.message.includes("not found") ? 404 : 500;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/v1/training/sessions/:sessionId/positions/:positionIndex
 * Fetch a single position by its 1-indexed order
 */
router.get("/sessions/:sessionId/positions/:positionIndex", async (req, res) => {
  try {
    const sessionData = await TrainingService.getSession(req.user.id, req.params.sessionId);
    const order = parseInt(req.params.positionIndex, 10);
    const position = sessionData.positions.find((p) => p.orderIndex === order);
    if (!position) {
      return res.status(404).json({ error: `Position at index ${order} not found.` });
    }
    return res.json({ session: sessionData.session, position });
  } catch (err) {
    return res.status(404).json({ error: err.message });
  }
});

/**
 * POST /api/v1/training/sessions/:sessionId/attempt
 * Submit a move attempt. Validates legal move with chess.js, evaluates quality,
 * and updates session/progress in an atomic transaction.
 */
router.post("/sessions/:sessionId/attempt", async (req, res) => {
  try {
    const { positionId, move, timeSpentMs } = req.body || {};
    if (!positionId || !move) {
      return res.status(400).json({ error: "Missing required fields: positionId and move are required." });
    }

    invalidateTrainingCache(req.user.id);
    const result = await TrainingService.submitAttempt(req.user.id, req.params.sessionId, {
      positionId,
      move,
      timeSpentMs,
    });

    return res.json(result);
  } catch (err) {
    const status = err.message.includes("Illegal move") || err.message.includes("already been attempted") ? 400 : 500;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/v1/training/sessions/:sessionId/complete
 * Manually mark a session as complete
 */
router.post("/sessions/:sessionId/complete", async (req, res) => {
  try {
    invalidateTrainingCache(req.user.id);
    const result = await TrainingService.completeSession(req.user.id, req.params.sessionId);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/v1/training/recommendations
 * Backwards compatibility for existing dashboard/frontend hooks
 */
router.get("/recommendations", async (req, res) => {
  try {
    const overview = await TrainingService.getOverview(req.user.id);
    if (!overview.sufficientData) {
      return res.json({ recommendations: [], weaknesses: [] });
    }

    const recommendations = (overview.weaknesses || []).map((w, idx) => ({
      id: `rec_${idx}`,
      targetWeakness: w,
      title: `Mastering ${w}`,
      description: `Targeted practice scenarios built from your real analyzed games to reduce ${w.toLowerCase()}.`,
      difficulty: overview.progress?.currentDifficulty || "Intermediate",
      estimatedMinutes: 15,
      samplePositionsCount: 5,
    }));

    return res.json({ recommendations, weaknesses: overview.weaknesses });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch training recommendations", details: err.message });
  }
});

export default router;
