import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";
import { MLServiceBridge } from "../services/ml/mlService.js";

const router = Router();

// In-memory cache for fast model version retrieval (<5ms)
const modelsCache = new Map();

// GET /api/v1/models
router.get("/", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const cached = modelsCache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
      return res.json(cached.data);
    }

    let models = await prisma.mLModelVersion.findMany({
      where: { userId },
      orderBy: { version: "desc" },
    });

    if (models.length === 0 && req.user.email) {
      models = await prisma.mLModelVersion.findMany({
        where: { user: { email: req.user.email } },
        orderBy: { version: "desc" },
      });
    }

    const currentSelf = models.find((m) => m.modelType === "CURRENT_SELF");
    const peakSelf = models.find((m) => m.modelType === "PEAK_SELF");

    const payload = {
      currentSelf: currentSelf || { status: "NOT_AVAILABLE" },
      peakSelf: peakSelf || { status: "NOT_AVAILABLE" },
      allVersions: models,
    };

    const responsePayload = {
      ...payload,
      models: payload,
    };

    modelsCache.set(userId, { data: responsePayload, expiresAt: Date.now() + 20000 });

    return res.json(responsePayload);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch models", details: err.message });
  }
});

// POST /api/v1/models/current-self/train
router.post(
  "/current-self/train",
  authenticateSupabaseUser,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await MLServiceBridge.triggerModelTraining(
        userId,
        "CURRENT_SELF",
      );
      return res.json({ message: "Current Self training requested", result });
    } catch (err) {
      return res
        .status(500)
        .json({
          error: "Failed to trigger Current Self training",
          details: err.message,
        });
    }
  },
);

// GET /api/v1/models/current-self/status
router.get(
  "/current-self/status",
  authenticateSupabaseUser,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const model = await prisma.mLModelVersion.findFirst({
        where: { userId, modelType: "CURRENT_SELF" },
        orderBy: { version: "desc" },
      });
      return res.json({
        status: model ? model.status : "NOT_AVAILABLE",
        model,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to fetch status", details: err.message });
    }
  },
);

// POST /api/v1/models/peak-self/train
router.post("/peak-self/train", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await MLServiceBridge.triggerModelTraining(
      userId,
      "PEAK_SELF",
    );
    return res.json({ message: "Peak Self training requested", result });
  } catch (err) {
    return res
      .status(500)
      .json({
        error: "Failed to trigger Peak Self training",
        details: err.message,
      });
  }
});

// GET /api/v1/models/peak-self/status
router.get("/peak-self/status", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const model = await prisma.mLModelVersion.findFirst({
      where: { userId, modelType: "PEAK_SELF" },
      orderBy: { version: "desc" },
    });
    return res.json({ status: model ? model.status : "NOT_AVAILABLE", model });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch status", details: err.message });
  }
});

import axios from "axios";
// POST /api/v1/models/current-self/predict
router.post("/current-self/predict", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { fen, positionFeatures, candidateFeatures, candidateMoves } = req.body;
    
    if (!fen || !positionFeatures || !candidateFeatures || !candidateMoves) {
       return res.status(400).json({ error: "Missing required inference inputs" });
    }

    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const response = await axios.post(`${ML_SERVICE_URL}/api/v1/ml/predict`, {
      user_id: userId,
      fen,
      position_features: positionFeatures,
      candidate_features: candidateFeatures,
      candidate_moves: candidateMoves
    }, { timeout: 5000 });

    return res.json(response.data);
  } catch (err) {
    console.error("Inference Error:", err.message);
    if (err.response && err.response.data) {
       return res.status(err.response.status).json(err.response.data);
    }
    return res.status(500).json({ error: "Failed to predict move", details: err.message });
  }
});

// GET /api/v1/models/history
router.get("/history", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const models = await prisma.mLModelVersion.findMany({
      where: { userId },
      orderBy: [{ modelType: "asc" }, { version: "desc" }],
      include: {
        dependentModel: {
          select: { id: true, version: true, modelType: true, status: true },
        },
      },
    });

    const retrainingJobs = await prisma.modelRetrainingJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ models, retrainingJobs });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch model history", details: err.message });
  }
});

// POST /api/v1/models/rollback
router.post("/rollback", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetCurrentModelId, targetPeakModelId, targetVersion } = req.body;

    let targetCurrentId = targetCurrentModelId;
    let targetPeakId = targetPeakModelId;

    // If targetVersion is supplied instead of ID, resolve it safely for this user
    if (!targetCurrentId && targetVersion) {
      const currentModel = await prisma.mLModelVersion.findFirst({
        where: { userId, modelType: "CURRENT_SELF", version: parseInt(targetVersion, 10) },
      });
      if (!currentModel) {
        return res.status(404).json({ error: `Current Self version ${targetVersion} not found for this user.` });
      }
      targetCurrentId = currentModel.id;
    }

    if (!targetCurrentId) {
      return res.status(400).json({ error: "targetCurrentModelId or targetVersion is required." });
    }

    // Verify ownership server-side
    const currentModelRecord = await prisma.mLModelVersion.findUnique({
      where: { id: targetCurrentId },
    });

    if (!currentModelRecord || currentModelRecord.userId !== userId) {
      return res.status(403).json({ error: "Target model not found or unauthorized." });
    }

    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const mlResponse = await axios.post(
      `${ML_SERVICE_URL}/api/v1/ml/retrain/rollback`,
      {
        user_id: userId,
        target_current_id: targetCurrentId,
        target_peak_id: targetPeakId || null,
        operator: `AUTH_USER:${userId.slice(0, 8)}`,
      },
      { timeout: 15000 }
    );

    return res.json(mlResponse.data);
  } catch (err) {
    console.error("Model rollback error:", err.message);
    const detail = err.response?.data?.detail || err.message;
    return res.status(400).json({ error: "Model rollback failed", details: detail });
  }
});

export default router;
