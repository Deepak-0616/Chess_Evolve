import { Worker } from "bullmq";
import { redisConfig } from "../utils/redis.js";
import { prisma } from "../utils/prisma.js";
import axios from "axios";

export const trainingWorker = new Worker(
  "model-training",
  async (job) => {
    const { modelVersionId, datasetId, userId, modelType } = job.data;
    console.log(`[TrainingWorker] Starting training for ModelVersion=${modelVersionId} (${modelType}) User=${userId}`);

    try {
      await prisma.mLModelVersion.update({
        where: { id: modelVersionId },
        data: { status: "TRAINING" },
      });

      await job.updateProgress(25);

      const mlUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
      const endpoint =
        modelType === "PEAK_SELF"
          ? "/api/v1/ml/train/peak-self"
          : "/api/v1/ml/train/current-self";

      // Call Python ML service with run_sync: true so BullMQ manages the execution
      const res = await axios.post(
        `${mlUrl}${endpoint}`,
        {
          model_version_id: modelVersionId,
          dataset_id: datasetId,
          user_id: userId,
          run_sync: true,
        },
        { timeout: 600000 } // 10 minute timeout for neural net training
      );

      await job.updateProgress(100);
      console.log(`[TrainingWorker] Training completed for ${modelVersionId}`);
      return { success: true, result: res.data };
    } catch (err) {
      console.error(`[TrainingWorker] Training failed for ${modelVersionId}:`, err.message);
      await prisma.mLModelVersion.update({
        where: { id: modelVersionId },
        data: {
          status: "FAILED",
          metrics: { error: err.response?.data?.detail || err.message },
        },
      });
      throw err;
    }
  },
  {
    connection: redisConfig,
    concurrency: 1, // Only 1 training job per worker node to protect GPU/CPU
  }
);

// Backward compatibility export
export const currentSelfTrainingWorker = trainingWorker;
