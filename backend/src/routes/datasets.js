import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";
import axios from "axios";

const router = Router();

router.post("/generate", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      featureVersion = "v1",
      datasetVersion = "v1",
      generateCurrentSelf = true,
      generatePeakSelf = true,
    } = req.body;

    const featureDataset = await prisma.featureDataset.findUnique({
      where: { userId_featureVersion: { userId, featureVersion } },
    });

    if (!featureDataset || featureDataset.status !== "COMPLETED") {
      return res.status(400).json({
        error: "Feature generation is not complete. Dataset generation cannot start yet.",
      });
    }

    const totalFeatureRecords = await prisma.featureRecord.count({
      where: { userId, featureVersion },
    });

    if (totalFeatureRecords === 0) {
      return res.status(400).json({ error: "No feature records found." });
    }

    // Determine what we're generating
    const typesToGenerate = [];
    if (generateCurrentSelf) typesToGenerate.push("CURRENT_SELF");
    if (generatePeakSelf) typesToGenerate.push("PEAK_SELF");

    if (typesToGenerate.length === 0) {
      return res.status(400).json({ error: "Must generate at least one dataset type." });
    }

    const jobIds = [];
    for (const type of typesToGenerate) {
      const job = await prisma.datasetGenerationJob.create({
        data: {
          userId,
          status: "PENDING",
          datasetType: type,
          featureVersion,
          datasetVersion,
          targetVersion: "v1",
          totalRecords: totalFeatureRecords,
        },
      });
      jobIds.push(job.id);
      processDatasetExtraction(job.id, userId, type, featureVersion, datasetVersion);
    }

    return res.json({
      message: "Dataset generation queued successfully.",
      jobIds,
    });
  } catch (err) {
    console.error("Dataset generate error:", err);
    return res.status(500).json({ error: "Failed to queue dataset.", details: err.message });
  }
});

router.get("/status/:jobId", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const job = await prisma.datasetGenerationJob.findUnique({
      where: { id: req.params.jobId },
    });

    if (!job || job.userId !== userId) {
      return res.status(404).json({ error: "Job not found" });
    }

    return res.json({ job });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch job status", details: err.message });
  }
});

export default router;

async function processDatasetExtraction(jobId, userId, datasetType, featureVersion, datasetVersion) {
  try {
    await prisma.datasetGenerationJob.update({
      where: { id: jobId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    // We need chronologically ordered games to do a train/val/test split properly without leakage
    const games = await prisma.game.findMany({
      where: { chessProfile: { userId } },
      orderBy: { playedAt: "asc" },
      select: { id: true },
    });

    if (games.length === 0) {
      throw new Error("No games found for split.");
    }

    const totalGames = games.length;
    const trainCount = Math.floor(totalGames * 0.7);
    const valCount = Math.floor(totalGames * 0.15);
    
    // Create quick lookup for split
    const splitMap = {};
    for (let i = 0; i < totalGames; i++) {
      let split = "TEST";
      if (i < trainCount) split = "TRAIN";
      else if (i < trainCount + valCount) split = "VALIDATION";
      splitMap[games[i].id] = split;
    }

    // Now chunk the FeatureRecords. (In production, use cursor-based pagination)
    const records = await prisma.featureRecord.findMany({
      where: { userId, featureVersion },
      take: 2000,
    });

    // Attach splits
    const batch = records.map((r) => {
      const split = splitMap[r.gameId] || "TEST";
      return { ...r, split };
    });

    const payload = {
      featureVersion,
      datasetVersion,
      generateCurrentSelf: datasetType === "CURRENT_SELF",
      generatePeakSelf: datasetType === "PEAK_SELF",
      batch,
    };

    const mlUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const res = await axios.post(`${mlUrl}/api/v1/ml/datasets/generate`, payload);

    if (res.data.success) {
      let dataset = await prisma.mLDataset.findUnique({
        where: { userId_datasetType_version: { userId, datasetType, version: datasetVersion } },
      });

      if (!dataset) {
        dataset = await prisma.mLDataset.create({
          data: {
            userId,
            datasetType,
            version: datasetVersion,
            featureVersion,
            targetVersion: "v1",
            totalGames,
          },
        });
      }

      let created = 0;
      let trainRecs = 0;
      let valRecs = 0;
      let testRecs = 0;

      for (const rec of res.data.records) {
        if (rec.datasetType !== datasetType) continue; // Ensure we only save the correct one

        await prisma.mLDatasetRecord.create({
          data: {
            datasetId: dataset.id,
            userId,
            gameId: rec.gameId,
            positionId: rec.positionId,
            moveNumber: rec.moveNumber,
            split: rec.split,
            candidateMove: rec.candidateMove,
            actualMove: rec.actualMove,
            isActualMove: rec.isActualMove,
            isPeakTarget: rec.isPeakTarget,
            peakScore: rec.peakScore,
            features: rec.features,
            metadata: rec.metadata,
          },
        });
        created++;
        if (rec.split === "TRAIN") trainRecs++;
        if (rec.split === "VALIDATION") valRecs++;
        if (rec.split === "TEST") testRecs++;
      }

      await prisma.mLDataset.update({
        where: { id: dataset.id },
        data: {
          totalRecords: created,
          trainRecords: trainRecs,
          validationRecords: valRecs,
          testRecords: testRecs,
        },
      });

      await prisma.datasetGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          processedRecords: created,
        },
      });
    }
  } catch (err) {
    console.error("Dataset generation worker failed:", err);
    await prisma.datasetGenerationJob.update({
      where: { id: jobId },
      data: { status: "FAILED", error: err.message, completedAt: new Date() },
    });
  }
}
