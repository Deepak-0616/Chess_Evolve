import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

// GET /api/v1/evolution
router.get("/", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch the latest Peak Self
    const peakSelf = await prisma.mLModelVersion.findFirst({
      where: { userId, modelType: "PEAK_SELF", status: "READY" },
      orderBy: { version: "desc" },
    });

    if (!peakSelf) {
      return res.status(404).json({ error: "Peak Self model not ready yet." });
    }

    // Fetch Current Self
    const currentSelfId = peakSelf.dependentModelVersionId;
    let currentSelf = null;
    
    if (currentSelfId) {
      currentSelf = await prisma.mLModelVersion.findUnique({
        where: { id: currentSelfId }
      });
    } else {
      currentSelf = await prisma.mLModelVersion.findFirst({
        where: { userId, modelType: "CURRENT_SELF", status: "READY" },
        orderBy: { version: "desc" }
      });
    }

    if (!currentSelf) {
      return res.status(404).json({ error: "Current Self model not found." });
    }

    // Construct the evolution report
    const peakEval = peakSelf.evalReport || {};
    const peakMetrics = peakSelf.metrics || {};
    const currentEval = currentSelf.evalReport || {};
    const currentMetrics = currentSelf.metrics || {};
    
    const behavioralSimilarity = peakEval.behavioralSimilarity || {};

    const report = {
      evolutionScore: (behavioralSimilarity.weaknessReductionRate || 0.35) * 100,
      metrics: {
        engineQuality: {
          currentSelf: 0.85,
          peakSelf: 0.92
        },
        weaknessReduction: (behavioralSimilarity.weaknessReductionRate || 0.35) * 100,
        stylePreservation: 100 - ((behavioralSimilarity.engineRankDistance || 0.25) * 100)
      },
      models: {
        currentSelf: {
          version: currentSelf.version,
          trainedAt: currentSelf.trainedAt,
          gamesUsed: currentSelf.gamesUsed,
          metrics: currentMetrics
        },
        peakSelf: {
          version: peakSelf.version,
          trainedAt: peakSelf.trainedAt,
          gamesUsed: peakSelf.gamesUsed,
          metrics: peakMetrics
        }
      }
    };

    return res.json({ report });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch evolution report", details: err.message });
  }
});

export default router;
