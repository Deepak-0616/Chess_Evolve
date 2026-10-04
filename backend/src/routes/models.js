import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";
import { MLServiceBridge } from "../services/ml/mlService.js";

const router = Router();

// GET /api/v1/models
router.get("/", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const models = await prisma.mLModelVersion.findMany({
      where: { userId },
      orderBy: { version: "desc" },
    });

    const currentSelf = models.find((m) => m.modelType === "CURRENT_SELF");
    const peakSelf = models.find((m) => m.modelType === "PEAK_SELF");

    return res.json({
      currentSelf: currentSelf || { status: "NOT_AVAILABLE" },
      peakSelf: peakSelf || { status: "NOT_AVAILABLE" },
      allVersions: models,
    });
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

export default router;
