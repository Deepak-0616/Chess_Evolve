import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { authenticate } from "../middleware/auth.js";
import { MLService } from "../services/ml/mlService.js";

const router = Router();
const prisma = new PrismaClient();

// Train Current Self Model (returns 202 Accepted + jobId)
router.post("/v1/models/current-self/train", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await MLService.trainCurrentSelf(userId);
    return res.status(202).json({
      success: true,
      data: {
        jobId: result.jobId,
        version: result.version,
        status: result.status,
      },
    });
  } catch (err) {
    return sendError(res, "TRAINING_INIT_FAILED", err.message || "Failed to initialize Current Self model training", 500);
  }
});

// Get Current Self Model Status
router.get("/v1/models/current-self/status", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await MLService.getModelStatus(userId, "CURRENT_SELF");
    return sendSuccess(res, status);
  } catch (err) {
    return sendError(res, "STATUS_FETCH_FAILED", err.message, 500);
  }
});

// Train Peak Self Model (returns 202 Accepted + jobId)
router.post("/v1/models/peak-self/train", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await MLService.trainPeakSelf(userId);
    return res.status(202).json({
      success: true,
      data: {
        jobId: result.jobId,
        version: result.version,
        status: result.status,
      },
    });
  } catch (err) {
    return sendError(res, "TRAINING_INIT_FAILED", err.message || "Failed to initialize Peak Self model training", 500);
  }
});

// Get Peak Self Model Status
router.get("/v1/models/peak-self/status", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await MLService.getModelStatus(userId, "PEAK_SELF");
    return sendSuccess(res, status);
  } catch (err) {
    return sendError(res, "STATUS_FETCH_FAILED", err.message, 500);
  }
});

// Get active model summary for user
router.get("/v1/models", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const [currentSelf, peakSelf] = await Promise.all([
      MLService.getModelStatus(userId, "CURRENT_SELF"),
      MLService.getModelStatus(userId, "PEAK_SELF"),
    ]);

    return sendSuccess(res, {
      currentSelf,
      peakSelf,
    });
  } catch (err) {
    return sendError(res, "MODELS_FETCH_FAILED", err.message, 500);
  }
});

// Get model version history
router.get("/v1/models/:modelType/history", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { modelType } = req.params;

    const normalizedType = modelType.toUpperCase().replace("-", "_");

    const history = await prisma.mLModelVersion.findMany({
      where: { userId, modelType: normalizedType },
      orderBy: { version: "desc" },
    });

    return sendSuccess(res, {
      modelType: normalizedType,
      history: history.map((h) => ({
        id: h.id,
        version: h.version,
        status: h.status,
        gamesUsed: h.gamesUsed,
        positionsUsed: h.positionsUsed,
        metrics: h.metrics ? JSON.parse(h.metrics) : null,
        trainedAt: h.trainedAt,
        createdAt: h.createdAt,
      })),
    });
  } catch (err) {
    return sendError(res, "HISTORY_FETCH_FAILED", err.message, 500);
  }
});

// Internal prediction API endpoints
router.post("/internal/ml/current-self/predict", async (req, res) => {
  try {
    const { userId, candidates, dna, fen } = req.body;
    const prediction = await MLService.predictCurrentSelf(userId, candidates || [], dna || {}, fen);
    return sendSuccess(res, prediction);
  } catch (err) {
    return sendError(res, "PREDICTION_FAILED", err.message, 500);
  }
});

router.post("/internal/ml/peak-self/predict", async (req, res) => {
  try {
    const { userId, candidates, dna, weaknesses, fen } = req.body;
    const prediction = await MLService.predictPeakSelf(userId, candidates || [], dna || {}, weaknesses || [], fen);
    return sendSuccess(res, prediction);
  } catch (err) {
    return sendError(res, "PREDICTION_FAILED", err.message, 500);
  }
});

export default router;
