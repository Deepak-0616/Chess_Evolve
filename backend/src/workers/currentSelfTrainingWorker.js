import { Worker } from 'bullmq';
import { prisma } from '../utils/prisma.js';
import axios from 'axios';
import { redisConfig } from '../utils/redis.js';

export const currentSelfTrainingWorker = new Worker('current-self-training', async job => {
  const { modelVersionId, datasetId, userId } = job.data;

  try {
    const mlUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
    
    // Call Python to start training task in background
    const res = await axios.post(`${mlUrl}/api/v1/ml/train/current-self`, {
      model_version_id: modelVersionId,
      dataset_id: datasetId,
      user_id: userId
    });

    if (res.data.success) {
      console.log(`[Worker] Triggered training for Model Version ${modelVersionId}`);
    } else {
      throw new Error("Failed to trigger ML training");
    }

  } catch (error) {
    console.error('[Worker] Training Trigger Failed:', error.message);
    await prisma.mLModelVersion.update({
      where: { id: modelVersionId },
      data: { status: 'FAILED', metrics: { error: error.message } }
    });
    throw error;
  }
}, { connection: redisConfig });
