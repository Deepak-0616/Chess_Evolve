import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";
import axios from "axios";

const router = Router();

// POST /api/v1/ml/features/generate
router.post("/generate", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user has a profile
    const profile = await prisma.chessProfile.findUnique({
      where: { userId }
    });
    
    if (!profile) {
      return res.status(404).json({ error: "Chess profile not found. Connect account first." });
    }

    // Determine how many games are synced
    const gamesCount = await prisma.game.count({
      where: { chessProfileId: profile.id }
    });
    
    if (gamesCount === 0) {
      return res.status(400).json({ error: "No games synced yet. Run sync first." });
    }

    // Create the background job
    const job = await prisma.featureGenerationJob.create({
      data: {
        userId,
        status: "PENDING",
        gamesTotal: gamesCount,
        featureVersion: "v1"
      }
    });

    // Process via durable BullMQ featureQueue with fallback
    try {
      const { featureQueue, safeEnqueue } = await import("../queues/index.js");
      await safeEnqueue(
        featureQueue,
        "extract",
        { jobId: job.id, userId, featureVersion: "v1" },
        { jobId: `feature_${job.id}` },
        () => processFeatureExtraction(job.id, userId)
      );
    } catch (queueErr) {
      processFeatureExtraction(job.id, userId);
    }

    return res.json({ 
      message: "Feature extraction job queued successfully.", 
      jobId: job.id 
    });

  } catch (err) {
    console.error("Feature generate error:", err);
    return res.status(500).json({ error: "Failed to create feature generation job.", details: err.message });
  }
});

// GET /api/v1/ml/features/status/:jobId
router.get("/status/:jobId", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    const job = await prisma.featureGenerationJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    
    if (job.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized access to this job." });
    }

    return res.json({ job });
  } catch (err) {
    console.error("Feature status error:", err);
    return res.status(500).json({ error: "Failed to fetch job status", details: err.message });
  }
});

export default router;

// Background worker logic (simulates BullMQ consumer)
async function processFeatureExtraction(jobId, userId) {
  try {
    await prisma.featureGenerationJob.update({
      where: { id: jobId },
      data: { status: "RUNNING", startedAt: new Date() }
    });

    const positions = await prisma.positionAnalysis.findMany({
      where: { game: { chessProfile: { userId } } },
      take: 1000 // In production, we would loop with pagination
    });

    if (positions.length === 0) {
      await prisma.featureGenerationJob.update({
        where: { id: jobId },
        data: { status: "COMPLETED", completedAt: new Date() }
      });
      return;
    }

    // Call Python ML Service
    const payload = {
      feature_version: "v1",
      batch: positions.map(p => ({
        userId,
        gameId: p.gameId,
        positionId: p.id,
        moveNumber: p.moveNumber,
        fen: p.fen,
        gamePhase: p.gamePhase,
        actualMove: p.move,
        candidates: p.candidateMoves || []
      }))
    };

    const mlUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const res = await axios.post(`${mlUrl}/api/v1/ml/features/generate`, payload);

    if (res.data.success) {
      // Create Dataset
      let dataset = await prisma.featureDataset.findUnique({
        where: { userId_featureVersion: { userId, featureVersion: "v1" } }
      });
      if (!dataset) {
        dataset = await prisma.featureDataset.create({
          data: { userId, featureVersion: "v1" }
        });
      }

      // Upsert records
      let created = 0;
      for (const rec of res.data.records) {
        await prisma.featureRecord.upsert({
          where: {
            userId_positionId_candidateMove_featureVersion: {
              userId,
              positionId: rec.positionId,
              candidateMove: rec.candidateMove,
              featureVersion: "v1"
            }
          },
          update: {
            position: rec.position,
            candidate: rec.candidate,
            player: rec.player,
            history: rec.history,
            weakness: rec.weakness
          },
          create: {
            featureDatasetId: dataset.id,
            userId,
            gameId: rec.gameId,
            positionId: rec.positionId,
            moveNumber: rec.moveNumber,
            candidateMove: rec.candidateMove,
            isActualMove: rec.isActualMove,
            featureVersion: "v1",
            position: rec.position,
            candidate: rec.candidate,
            player: rec.player,
            history: rec.history,
            weakness: rec.weakness
          }
        });
        created++;
      }

      await prisma.featureGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          positionsProcessed: positions.length,
          candidateRecordsGenerated: created
        }
      });
    }

  } catch (err) {
    console.error("Feature extraction worker failed:", err);
    await prisma.featureGenerationJob.update({
      where: { id: jobId },
      data: { status: "FAILED", error: err.message, completedAt: new Date() }
    });
  }
}

