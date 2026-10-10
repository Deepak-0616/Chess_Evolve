import axios from "axios";
import { prisma } from "../../utils/prisma.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// import { currentSelfTrainingQueue } from '../../queues/trainingQueue.js';

export class MLServiceBridge {
  static async triggerModelTraining(userId, modelType) {
    try {
      if (modelType !== "CURRENT_SELF" && modelType !== "PEAK_SELF") {
        throw new Error("Invalid model type");
      }
      
      const latestDataset = await prisma.mLDataset.findFirst({
        where: { userId, datasetType: modelType },
        orderBy: { version: "desc" }
      });
      
      if (!latestDataset) {
        throw new Error(`No ${modelType} dataset found for user.`);
      }

      let dependentModelVersionId = null;
      if (modelType === "PEAK_SELF") {
        const currentSelf = await prisma.mLModelVersion.findFirst({
          where: { userId, modelType: "CURRENT_SELF", status: "READY" },
          orderBy: { version: "desc" }
        });
        if (!currentSelf) {
          throw new Error("Cannot train Peak Self without a READY Current Self model.");
        }
        dependentModelVersionId = currentSelf.id;
      }

      // Upsert MLModelVersion
      const modelVersion = await prisma.mLModelVersion.upsert({
        where: { userId_modelType_version: { userId, modelType, version: 1 } },
        create: {
          userId,
          modelType,
          version: 1,
          gamesUsed: latestDataset.totalGames,
          positionsUsed: latestDataset.totalPositions,
          status: "QUEUED",
          datasetVersion: latestDataset.version,
          featureVersion: latestDataset.featureVersion,
          dependentModelVersionId
        },
        update: {
          status: "QUEUED",
          gamesUsed: latestDataset.totalGames,
          positionsUsed: latestDataset.totalPositions,
          datasetVersion: latestDataset.version,
          dependentModelVersionId
        },
      });

      // Dispatch to durable BullMQ trainingQueue with idempotency
      try {
        const { trainingQueue, safeEnqueue } = await import("../../queues/index.js");
        await safeEnqueue(
          trainingQueue,
          "train",
          {
            modelVersionId: modelVersion.id,
            datasetId: latestDataset.id,
            userId,
            modelType,
          },
          { jobId: `train_${modelVersion.id}` },
          async () => {
            const endpoint = modelType === "CURRENT_SELF" ? "/api/v1/ml/train/current-self" : "/api/v1/ml/train/peak-self";
            await axios.post(
              `${ML_SERVICE_URL}${endpoint}`,
              {
                user_id: userId,
                model_version_id: modelVersion.id,
                dataset_id: latestDataset.id,
              },
              { timeout: 10000 }
            );
          }
        );
        console.log(`[MLServiceBridge] Training job dispatched for model ${modelVersion.id}`);
      } catch (queueErr) {
        console.warn("[MLServiceBridge] Queue dispatch fallback to direct HTTP:", queueErr.message);
        const endpoint = modelType === "CURRENT_SELF" ? "/api/v1/ml/train/current-self" : "/api/v1/ml/train/peak-self";
        await axios.post(
          `${ML_SERVICE_URL}${endpoint}`,
          {
            user_id: userId,
            model_version_id: modelVersion.id,
            dataset_id: latestDataset.id,
          },
          { timeout: 10000 }
        );
      }

      return { jobId: modelVersion.id, status: "QUEUED" };
    } catch (err) {
      console.error("Error triggering model training:", err);
      return { jobId: "error", status: "FAILED" };
    }
  }

  /**
   * Request move prediction from Python ML Service for game playing.
   */
  static async getModelPrediction(req) {
    try {
      const response = await axios
        .post(
          `${ML_SERVICE_URL}/api/v1/ml/predict`,
          {
            user_id: req.userId,
            model_type: req.modelType || "CURRENT_SELF",
            fen: req.fen,
            candidates: req.candidates,
            move_number: req.moveNumber || 1,
            game_phase: req.gamePhase || "MIDDLEGAME",
            model_version_id: req.modelVersionId,
          },
          { timeout: process.env.NODE_ENV === "test" ? 1500 : 8000 },
        )
        .catch((err) => {
          console.warn("[MLServiceBridge] Prediction call failed:", err?.response?.data || err.message);
          return null;
        });

      if (response && response.data && response.data.recommendedMove) {
        return response.data;
      }
    } catch (err) {
      console.warn("ML Service prediction endpoint fallback to candidate evaluation:", err.message);
    }

    // Deterministic fallback to candidate evaluation when ML service is unavailable
    const candidates = Array.isArray(req.candidates) ? req.candidates : [];
    if (candidates.length === 0) {
      return { error: "No candidates available", recommendedMove: null, isFallback: true };
    }

    // Compute softmax probabilities across candidates based on engine evaluation/centipawn loss
    const scores = candidates.map((c, i) => {
      const cp = typeof c.centipawn_loss === "number" ? c.centipawn_loss : (typeof c.cp_loss === "number" ? c.cp_loss : i * 20);
      return -cp / 50.0;
    });
    const maxScore = Math.max(...scores);
    const expScores = scores.map(s => Math.exp(s - maxScore));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const probs = expScores.map(e => e / (sumExp || 1));

    const moveProbabilities = {};
    candidates.forEach((c, i) => {
      moveProbabilities[c.move || c.san] = Number(probs[i].toFixed(4));
    });

    // Ensure sum of probabilities is normalized to 1.0
    const currentSum = Object.values(moveProbabilities).reduce((a, b) => a + b, 0);
    if (currentSum > 0 && Math.abs(1.0 - currentSum) > 0.0001) {
      const firstKey = Object.keys(moveProbabilities)[0];
      moveProbabilities[firstKey] = Number((moveProbabilities[firstKey] + (1.0 - currentSum)).toFixed(4));
    }

    // For Peak Self, select top candidate with blunder protection (lowest cp_loss)
    // For Current Self, select top probability candidate
    let chosenIdx = 0;
    if (req.modelType === "PEAK_SELF") {
      const blunderFiltered = candidates
        .map((c, i) => ({ c, i, cp: typeof c.centipawn_loss === "number" ? c.centipawn_loss : (c.cp_loss || 0) }))
        .filter(item => item.cp < 100);
      if (blunderFiltered.length > 0) {
        chosenIdx = blunderFiltered[0].i;
      }
    }

    const chosenCandidate = candidates[chosenIdx] || candidates[0];
    const recommendedMove = chosenCandidate.move || chosenCandidate.san;
    const confidence = Number(probs[chosenIdx].toFixed(4));

    return {
      recommendedMove,
      confidence,
      moveProbabilities,
      modelType: req.modelType,
      modelVersion: req.modelVersionId || "v1",
      chosenEngineRank: chosenCandidate.rank || (chosenIdx + 1),
      isFallback: true,
      fallbackReason: "ML service prediction unavailable — using candidate evaluation"
    };
  }
}
