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
          { timeout: 8000 },
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

    // Deterministic fallback to first Stockfish candidate when ML service is unavailable
    // This is NOT a model prediction — it is a Stockfish fallback and is labeled as such
    const fallbackMove = req.candidates && req.candidates.length > 0
        ? (req.candidates[0].san || req.candidates[0].move)
        : null;
    
    if (!fallbackMove) {
      return { error: "No candidates available", recommendedMove: null, isFallback: true };
    }
    
    return {
      recommendedMove: fallbackMove,
      confidence: null,           // NOT a model confidence — explicitly null
      moveProbabilities: null,    // NOT model probabilities — explicitly null
      modelType: req.modelType,
      modelVersion: null,
      isFallback: true,
      fallbackReason: "ML service prediction unavailable — using first Stockfish candidate"
    };
  }
}
