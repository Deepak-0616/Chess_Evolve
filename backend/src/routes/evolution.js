import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { EvolutionService } from "../services/evolution/evolutionService.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

// In-memory evolution cache for ultra-fast overview & progress tracking (<2ms)
const evolutionCache = new Map();
export const invalidateEvolutionCache = (userId) => {
  if (userId) {
    for (const key of evolutionCache.keys()) {
      if (key.startsWith(`${userId}_`)) evolutionCache.delete(key);
    }
  } else {
    evolutionCache.clear();
  }
};

// All evolution routes require Supabase JWT authentication
router.use(authenticateSupabaseUser);

/**
 * GET /api/v1/evolution
 * Comprehensive overview comparing baseline and recent gameplay cohorts,
 * deliberate training drills, weakness trajectories, and model comparisons.
 */
router.get("/", async (req, res) => {
  try {
    const cacheKey = `${req.user.id}_overview`;
    const cached = evolutionCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return res.json(cached.payload);
    }

    const overview = await EvolutionService.getOverview(req.user.id);

    const payload = {
      ...overview,
      report: overview.sufficientData ? {
        evolutionScore: overview.evolutionScore,
        insufficientData: overview.evolutionScore === null,
        metrics: {
          engineQuality: {
            currentSelf: overview.modelComparison?.currentSelf?.top1Accuracy != null
              ? overview.modelComparison.currentSelf.top1Accuracy / 100
              : null,
            peakSelf: overview.modelComparison?.peakSelf?.top1Accuracy != null
              ? overview.modelComparison.peakSelf.top1Accuracy / 100
              : null,
          },
          weaknessReduction: overview.modelComparison?.behavioralGap?.weaknessReductionRate ?? null,
          stylePreservation: overview.modelComparison?.behavioralGap?.stylePreservationRate ?? null,
          styleCollapseRate: overview.modelComparison?.behavioralGap?.styleCollapseRate ?? null,
        },
        models: {
          currentSelf: overview.modelComparison?.currentSelf || null,
          peakSelf: overview.modelComparison?.peakSelf || null,
        },
      } : null,
    };

    evolutionCache.set(cacheKey, { payload, expiresAt: Date.now() + 30000 });
    return res.json(payload);
  } catch (err) {
    console.error("Evolution overview error:", err);
    return res.status(500).json({ error: "Failed to fetch evolution overview", details: err.message });
  }
});

/**
 * GET /api/v1/evolution/timeline
 * Chronological timeline of real database milestones
 */
router.get("/timeline", async (req, res) => {
  try {
    const cacheKey = `${req.user.id}_timeline`;
    const cached = evolutionCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return res.json(cached.payload);

    const data = await EvolutionService.getTimeline(req.user.id);
    evolutionCache.set(cacheKey, { payload: data, expiresAt: Date.now() + 30000 });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch evolution timeline", details: err.message });
  }
});

/**
 * GET /api/v1/evolution/gameplay
 * Longitudinal gameplay progression across chronological quartiles
 */
router.get("/gameplay", async (req, res) => {
  try {
    const cacheKey = `${req.user.id}_gameplay`;
    const cached = evolutionCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return res.json(cached.payload);

    const data = await EvolutionService.getGameplayMetrics(req.user.id);
    evolutionCache.set(cacheKey, { payload: data, expiresAt: Date.now() + 30000 });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch gameplay metrics", details: err.message });
  }
});

/**
 * GET /api/v1/evolution/weaknesses
 * Weakness progression and trajectory statuses backed by empirical evidence
 */
router.get("/weaknesses", async (req, res) => {
  try {
    const cacheKey = `${req.user.id}_weaknesses`;
    const cached = evolutionCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return res.json(cached.payload);

    const overview = await EvolutionService.getOverview(req.user.id);
    const payload = {
      weaknessProgression: overview.weaknessProgression || [],
      sampleSize: overview.gameplayImprovement?.sampleSizeRecent || 0,
    };
    evolutionCache.set(cacheKey, { payload, expiresAt: Date.now() + 30000 });
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch weakness progression", details: err.message });
  }
});

/**
 * GET /api/v1/evolution/model-update-status
 * Evaluation of model retraining eligibility based on accumulated games & positions
 */
router.get("/model-update-status", async (req, res) => {
  try {
    const cacheKey = `${req.user.id}_model_status`;
    const cached = evolutionCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return res.json(cached.payload);

    const data = await EvolutionService.evaluateModelUpdateEligibility(req.user.id);
    evolutionCache.set(cacheKey, { payload: data, expiresAt: Date.now() + 30000 });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Failed to evaluate model update eligibility", details: err.message });
  }
});

/**
 * POST /api/v1/evolution/snapshots/generate
 * Generate and store an immutable historical snapshot
 */
router.post("/snapshots/generate", async (req, res) => {
  try {
    invalidateEvolutionCache(req.user.id);
    const { sourceType, notes } = req.body || {};
    const snapshot = await EvolutionService.generateSnapshot(req.user.id, sourceType || "MANUAL", notes);
    return res.status(201).json({ snapshot });
  } catch (err) {
    return res.status(400).json({ error: "Failed to generate evolution snapshot", details: err.message });
  }
});

/**
 * GET /api/v1/evolution/snapshots
 * Retrieve user's historical evolution snapshots
 */
router.get("/snapshots", async (req, res) => {
  try {
    const snapshots = await prisma.evolutionSnapshot.findMany({
      where: { userId: req.user.id },
      orderBy: { snapshotDate: "desc" },
      take: 20,
    });
    return res.json({ snapshots });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch snapshots", details: err.message });
  }
});

export default router;
