import { Worker } from "bullmq";
import { redisConfig } from "../utils/redis.js";
import { prisma } from "../utils/prisma.js";
import axios from "axios";

export const datasetWorker = new Worker(
  "dataset-generation",
  async (job) => {
    const { jobId, userId, datasetType, featureVersion, datasetVersion } = job.data;
    console.log(`[DatasetWorker] Processing job ${jobId} for user ${userId}, type=${datasetType}`);

    try {
      await prisma.datasetGenerationJob.update({
        where: { id: jobId },
        data: { status: "RUNNING", startedAt: new Date() },
      });

      await job.updateProgress(15);

      const games = await prisma.game.findMany({
        where: { chessProfile: { userId } },
        orderBy: { playedAt: "asc" },
        select: { id: true },
      });

      if (games.length === 0) {
        throw new Error("No games found for dataset split.");
      }

      const totalGames = games.length;
      const trainCount = Math.floor(totalGames * 0.7);
      const valCount = Math.floor(totalGames * 0.15);

      const splitMap = {};
      for (let i = 0; i < totalGames; i++) {
        let split = "TEST";
        if (i < trainCount) split = "TRAIN";
        else if (i < trainCount + valCount) split = "VALIDATION";
        splitMap[games[i].id] = split;
      }

      await job.updateProgress(35);

      const records = await prisma.featureRecord.findMany({
        where: { userId, featureVersion },
        take: 5000,
      });

      const batch = records.map((r) => ({
        ...r,
        split: splitMap[r.gameId] || "TEST",
      }));

      const payload = {
        featureVersion,
        datasetVersion,
        generateCurrentSelf: datasetType === "CURRENT_SELF",
        generatePeakSelf: datasetType === "PEAK_SELF",
        batch,
      };

      const mlUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
      const res = await axios.post(`${mlUrl}/api/v1/ml/datasets/generate`, payload, {
        timeout: 90000,
      });

      await job.updateProgress(65);

      if (res.data.success) {
        let dataset = await prisma.mLDataset.findUnique({
          where: {
            userId_datasetType_version: { userId, datasetType, version: datasetVersion },
          },
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
          if (rec.datasetType !== datasetType) continue;

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

        await job.updateProgress(100);
        return { success: true, processedRecords: created };
      } else {
        throw new Error(res.data.error || "Dataset generation failed in ML service");
      }
    } catch (err) {
      console.error(`[DatasetWorker] Error processing job ${jobId}:`, err.message);
      await prisma.datasetGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          error: err.message,
          completedAt: new Date(),
        },
      });
      throw err;
    }
  },
  {
    connection: redisConfig,
    concurrency: 2,
  }
);
