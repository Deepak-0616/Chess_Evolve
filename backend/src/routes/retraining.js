import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";
import axios from "axios";

const router = Router();
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// GET /api/v1/models/retrain/status
router.get("/status", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch latest job from DB
    const latestJob = await prisma.modelRetrainingJob.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // Fetch update candidate record
    const candidate = await prisma.modelUpdateCandidate.findUnique({
      where: { userId },
    });

    // Fetch active models
    const activeModels = await prisma.mLModelVersion.findMany({
      where: { userId, isActive: true },
      orderBy: { modelType: "asc" },
    });

    // Fetch all versions
    const allVersions = await prisma.mLModelVersion.findMany({
      where: { userId },
      orderBy: [{ modelType: "asc" }, { version: "desc" }],
    });

    return res.json({
      job: latestJob,
      eligibility: candidate,
      activeModels,
      allVersions,
    });
  } catch (err) {
    console.error("Retrain status error:", err);
    return res.status(500).json({ error: "Failed to fetch retraining status", details: err.message });
  }
});

// POST /api/v1/models/retrain/trigger
router.post("/trigger", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { dryRun = false, triggeredBy = "MANUAL" } = req.body;

    // Verify candidate eligibility
    const candidate = await prisma.modelUpdateCandidate.findUnique({
      where: { userId },
    });

    if (!candidate || candidate.status !== "RETRAINING_ELIGIBLE") {
      return res.status(400).json({
        error: "User is not currently eligible for retraining.",
        status: candidate ? candidate.status : "NO_RECORD",
      });
    }

    // Dispatch to durable BullMQ retrainingQueue with fallback
    try {
      const { retrainingQueue, safeEnqueue } = await import("../queues/index.js");
      const queuedJob = await safeEnqueue(
        retrainingQueue,
        "retrain",
        { userId, triggeredBy, dryRun },
        { jobId: `retrain_${userId}_${Date.now()}` },
        async () => {
          const mlResponse = await axios.post(`${ML_SERVICE_URL}/api/v1/ml/retrain/trigger`, {
            user_id: userId,
            triggered_by: triggeredBy,
            dry_run: dryRun,
          });
          return { id: mlResponse.data?.job_id || "direct_job", direct: true, data: mlResponse.data };
        }
      );
      return res.json({
        success: true,
        jobId: queuedJob?.id || "retrain_direct",
        message: queuedJob?.direct ? "Retraining pipeline triggered directly" : "Retraining pipeline enqueued to BullMQ worker",
      });
    } catch (queueErr) {
      // Fallback to direct Python ML service call
      const mlResponse = await axios.post(`${ML_SERVICE_URL}/api/v1/ml/retrain/trigger`, {
        user_id: userId,
        triggered_by: triggeredBy,
        dry_run: dryRun,
      }, { timeout: 10000 });

      return res.json(mlResponse.data);
    }
  } catch (err) {
    console.error("Retrain trigger error:", err);
    return res.status(500).json({
      error: "Failed to trigger retraining pipeline",
      details: err.response?.data || err.message,
    });
  }
});

// POST /api/v1/models/retrain/activate
router.post("/activate", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentModelId, peakModelId, jobId } = req.body;

    if (!currentModelId || !peakModelId || !jobId) {
      return res.status(400).json({ error: "Missing required activation IDs." });
    }

    // Call Python ML Service atomic activation endpoint
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/api/v1/ml/retrain/activate`, {
      user_id: userId,
      current_model_id: currentModelId,
      peak_model_id: peakModelId,
      job_id: jobId,
    }, { timeout: 15000 });

    return res.json(mlResponse.data);
  } catch (err) {
    console.error("Retrain activate error:", err);
    return res.status(500).json({
      error: "Failed to atomically activate candidate models",
      details: err.response?.data || err.message,
    });
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

    const jobs = await prisma.modelRetrainingJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ models, retrainingJobs: jobs });
  } catch (err) {
    console.error("History error:", err);
    return res.status(500).json({ error: "Failed to fetch model history", details: err.message });
  }
});

export default router;
