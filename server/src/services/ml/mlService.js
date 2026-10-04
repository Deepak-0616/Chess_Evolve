import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { DatasetGenerator } from "./datasetGenerator.js";
import { ModelTrainer } from "./modelTrainer.js";

const prisma = new PrismaClient();

export class MLService {
  /**
   * Train Current Self Model for user
   */
  static async trainCurrentSelf(userId) {
    const existing = await prisma.mLModelVersion.findFirst({
      where: { userId, modelType: "CURRENT_SELF" },
      orderBy: { version: "desc" },
    });

    const nextVersion = (existing?.version || 0) + 1;

    const modelRecord = await prisma.mLModelVersion.create({
      data: {
        userId,
        modelType: "CURRENT_SELF",
        version: nextVersion,
        status: "DATASET_GENERATING",
        gamesUsed: 0,
        positionsUsed: 0,
      },
    });

    // Execute dataset generation and training asynchronously
    setImmediate(async () => {
      try {
        const datasetRes = await DatasetGenerator.generateDatasets(userId);

        if (datasetRes.status === "INSUFFICIENT_DATA") {
          await prisma.mLModelVersion.update({
            where: { id: modelRecord.id },
            data: {
              status: "INSUFFICIENT_DATA",
              metrics: JSON.stringify({ error: datasetRes.message }),
            },
          });
          return;
        }

        await prisma.mLModelVersion.update({
          where: { id: modelRecord.id },
          data: {
            status: "TRAINING",
            gamesUsed: 40,
            positionsUsed: datasetRes.totalPositionsProcessed,
          },
        });

        const trainResult = ModelTrainer.trainCurrentSelfModel(userId, nextVersion, datasetRes);

        await prisma.mLModelVersion.update({
          where: { id: modelRecord.id },
          data: {
            status: "READY",
            artifactPath: trainResult.artifactPath,
            metrics: JSON.stringify(trainResult.metrics),
            trainedAt: new Date(),
          },
        });
      } catch (err) {
        console.error(`Current Self training failed for user ${userId}:`, err);
        await prisma.mLModelVersion.update({
          where: { id: modelRecord.id },
          data: {
            status: "FAILED",
            metrics: JSON.stringify({ error: err.message }),
          },
        });
      }
    });

    return {
      jobId: modelRecord.id,
      version: nextVersion,
      status: modelRecord.status,
    };
  }

  /**
   * Train Peak Self Model for user
   */
  static async trainPeakSelf(userId) {
    const existing = await prisma.mLModelVersion.findFirst({
      where: { userId, modelType: "PEAK_SELF" },
      orderBy: { version: "desc" },
    });

    const nextVersion = (existing?.version || 0) + 1;

    const modelRecord = await prisma.mLModelVersion.create({
      data: {
        userId,
        modelType: "PEAK_SELF",
        version: nextVersion,
        status: "DATASET_GENERATING",
        gamesUsed: 0,
        positionsUsed: 0,
      },
    });

    setImmediate(async () => {
      try {
        const datasetRes = await DatasetGenerator.generateDatasets(userId);

        if (datasetRes.status === "INSUFFICIENT_DATA") {
          await prisma.mLModelVersion.update({
            where: { id: modelRecord.id },
            data: {
              status: "INSUFFICIENT_DATA",
              metrics: JSON.stringify({ error: datasetRes.message }),
            },
          });
          return;
        }

        await prisma.mLModelVersion.update({
          where: { id: modelRecord.id },
          data: {
            status: "TRAINING",
            gamesUsed: 40,
            positionsUsed: datasetRes.totalPositionsProcessed,
          },
        });

        const trainResult = ModelTrainer.trainPeakSelfModel(userId, nextVersion, datasetRes);

        await prisma.mLModelVersion.update({
          where: { id: modelRecord.id },
          data: {
            status: "READY",
            artifactPath: trainResult.artifactPath,
            metrics: JSON.stringify(trainResult.metrics),
            trainedAt: new Date(),
          },
        });
      } catch (err) {
        console.error(`Peak Self training failed for user ${userId}:`, err);
        await prisma.mLModelVersion.update({
          where: { id: modelRecord.id },
          data: {
            status: "FAILED",
            metrics: JSON.stringify({ error: err.message }),
          },
        });
      }
    });

    return {
      jobId: modelRecord.id,
      version: nextVersion,
      status: modelRecord.status,
    };
  }

  /**
   * Get latest active model version status
   */
  static async getModelStatus(userId, modelType) {
    const modelRecord = await prisma.mLModelVersion.findFirst({
      where: { userId, modelType },
      orderBy: { version: "desc" },
    });

    if (!modelRecord) {
      return {
        modelType,
        status: "NOT_AVAILABLE",
        version: 0,
        message: "No model version created yet.",
      };
    }

    return {
      id: modelRecord.id,
      modelType: modelRecord.modelType,
      version: modelRecord.version,
      status: modelRecord.status,
      gamesUsed: modelRecord.gamesUsed,
      positionsUsed: modelRecord.positionsUsed,
      metrics: modelRecord.metrics ? JSON.parse(modelRecord.metrics) : null,
      trainedAt: modelRecord.trainedAt,
      createdAt: modelRecord.createdAt,
    };
  }

  /**
   * Predict candidate move probabilities using Current Self ML Model
   */
  static async predictCurrentSelf(userId, candidates, dna = {}) {
    const modelRecord = await prisma.mLModelVersion.findFirst({
      where: { userId, modelType: "CURRENT_SELF", status: "READY" },
      orderBy: { version: "desc" },
    });

    let weights = null;
    let bias = 0;

    if (modelRecord && modelRecord.artifactPath && fs.existsSync(modelRecord.artifactPath)) {
      try {
        const artifactContent = JSON.parse(fs.readFileSync(modelRecord.artifactPath, "utf8"));
        weights = artifactContent.weights;
        bias = artifactContent.bias || 0;
      } catch (e) {
        console.warn("Failed to load Current Self model artifact, using fallback inference", e);
      }
    }

    const predictions = candidates.map((cand) => {
      let logit = bias;
      if (weights) {
        Object.keys(weights).forEach((k) => {
          logit += (cand.features?.[k] || 0) * weights[k];
        });
      } else {
        // Fallback heuristic scoring if model not yet ready
        if (cand.san.includes("x")) logit += 0.8 * ((dna.tacticalPreference || 50) / 50);
        if (cand.san.includes("+")) logit += 0.9 * ((dna.aggression || 50) / 50);
      }

      const rawProb = 1 / (1 + Math.exp(-logit));
      return {
        uci: cand.uci,
        san: cand.san,
        probability: Number(rawProb.toFixed(3)),
      };
    });

    // Softmax normalization
    const totalProb = predictions.reduce((sum, p) => sum + p.probability, 0);
    const normalized = predictions.map((p) => ({
      ...p,
      probability: Number((p.probability / (totalProb || 1)).toFixed(3)),
    }));

    normalized.sort((a, b) => b.probability - a.probability);

    return {
      modelVersion: modelRecord ? `v${modelRecord.version}` : "v1-baseline",
      predictions: normalized,
    };
  }

  /**
   * Predict candidate move PeakScores using Peak Self ML Model
   */
  static async predictPeakSelf(userId, candidates, dna = {}, weaknesses = []) {
    const modelRecord = await prisma.mLModelVersion.findFirst({
      where: { userId, modelType: "PEAK_SELF", status: "READY" },
      orderBy: { version: "desc" },
    });

    let weights = null;
    let bias = 0.5;

    if (modelRecord && modelRecord.artifactPath && fs.existsSync(modelRecord.artifactPath)) {
      try {
        const artifactContent = JSON.parse(fs.readFileSync(modelRecord.artifactPath, "utf8"));
        weights = artifactContent.weights;
        bias = artifactContent.bias || 0.5;
      } catch (e) {
        console.warn("Failed to load Peak Self model artifact, using fallback inference", e);
      }
    }

    const predictions = candidates.map((cand) => {
      let score = bias;
      if (weights) {
        Object.keys(weights).forEach((k) => {
          score += (cand.features?.[k] || 0) * weights[k];
        });
      } else {
        const stockfishQuality = Math.max(0, 1.0 - (cand.evalDiff || 0) / 300);
        score = stockfishQuality * 0.7 + 0.3 * ((dna.tacticalPreference || 50) / 100);
      }

      const peakScore = Math.min(0.99, Math.max(0.01, score));
      return {
        uci: cand.uci,
        san: cand.san,
        peakScore: Number(peakScore.toFixed(3)),
      };
    });

    predictions.sort((a, b) => b.peakScore - a.peakScore);

    return {
      modelVersion: modelRecord ? `v${modelRecord.version}` : "v1-baseline",
      predictions,
    };
  }
}
