import { Worker } from "bullmq";
import { redisConfig } from "../utils/redis.js";
import { prisma } from "../utils/prisma.js";
import axios from "axios";

export const featureWorker = new Worker(
  "feature-generation",
  async (job) => {
    const { jobId, userId, featureVersion = "v1" } = job.data;
    console.log(`[FeatureWorker] Processing job ${jobId} for user ${userId}`);

    try {
      await prisma.featureGenerationJob.update({
        where: { id: jobId },
        data: { status: "RUNNING", startedAt: new Date() },
      });

      await job.updateProgress(20);

      const positions = await prisma.positionAnalysis.findMany({
        where: { game: { chessProfile: { userId } } },
        take: 2000,
      });

      if (positions.length === 0) {
        await prisma.featureGenerationJob.update({
          where: { id: jobId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
        await job.updateProgress(100);
        return { success: true, count: 0 };
      }

      await job.updateProgress(40);

      const payload = {
        feature_version: featureVersion,
        batch: positions.map((p) => ({
          userId,
          gameId: p.gameId,
          positionId: p.id,
          moveNumber: p.moveNumber,
          fen: p.fen,
          gamePhase: p.gamePhase,
          actualMove: p.move,
          candidates: p.candidateMoves || [],
        })),
      };

      const mlUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
      const res = await axios.post(`${mlUrl}/api/v1/ml/features/generate`, payload, {
        timeout: 60000,
      });

      await job.updateProgress(70);

      if (res.data.success) {
        let dataset = await prisma.featureDataset.findUnique({
          where: { userId_featureVersion: { userId, featureVersion } },
        });
        if (!dataset) {
          dataset = await prisma.featureDataset.create({
            data: { userId, featureVersion },
          });
        }

        let created = 0;
        for (const rec of res.data.records) {
          await prisma.featureRecord.upsert({
            where: {
              userId_positionId_candidateMove_featureVersion: {
                userId,
                positionId: rec.positionId,
                candidateMove: rec.candidateMove,
                featureVersion,
              },
            },
            update: {
              position: rec.position,
              candidate: rec.candidate,
              player: rec.player,
              history: rec.history,
              weakness: rec.weakness,
            },
            create: {
              featureDatasetId: dataset.id,
              userId,
              gameId: rec.gameId,
              positionId: rec.positionId,
              moveNumber: rec.moveNumber,
              candidateMove: rec.candidateMove,
              isActualMove: rec.isActualMove,
              featureVersion,
              position: rec.position,
              candidate: rec.candidate,
              player: rec.player,
              history: rec.history,
              weakness: rec.weakness,
            },
          });
          created++;
        }

        await prisma.featureGenerationJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            positionsProcessed: positions.length,
            candidateRecordsGenerated: created,
          },
        });

        await job.updateProgress(100);
        return { success: true, recordsCreated: created };
      } else {
        throw new Error(res.data.error || "Feature extraction failed in ML service");
      }
    } catch (err) {
      console.error(`[FeatureWorker] Error processing job ${jobId}:`, err.message);
      await prisma.featureGenerationJob.update({
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
