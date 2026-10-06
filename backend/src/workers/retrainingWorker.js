import { Worker } from "bullmq";
import { redisConfig } from "../utils/redis.js";
import { prisma } from "../utils/prisma.js";
import axios from "axios";

export const retrainingWorker = new Worker(
  "model-retraining",
  async (job) => {
    const { userId, triggeredBy = "MANUAL", dryRun = false } = job.data;
    console.log(`[RetrainingWorker] Processing retraining for User=${userId} triggeredBy=${triggeredBy}`);

    try {
      await job.updateProgress(10);
      const mlUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";

      const res = await axios.post(
        `${mlUrl}/api/v1/ml/retrain/trigger`,
        {
          user_id: userId,
          triggered_by: triggeredBy,
          dry_run: dryRun,
          run_sync: true,
        },
        { timeout: 900000 } // 15 minute timeout for full retraining pipeline
      );

      await job.updateProgress(100);
      console.log(`[RetrainingWorker] Retraining job completed for User=${userId}`);
      return { success: true, data: res.data };
    } catch (err) {
      console.error(`[RetrainingWorker] Failed for User=${userId}:`, err.message);
      throw err;
    }
  },
  {
    connection: redisConfig,
    concurrency: 1,
  }
);
