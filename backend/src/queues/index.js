import { Queue } from "bullmq";
import { redisConfig, isRedisConnected } from "../utils/redis.js";

export async function safeEnqueue(queue, jobName, data, opts = {}, fallbackFn = null) {
  const isUp = await isRedisConnected();
  if (isUp) {
    try {
      const job = await Promise.race([
        queue.add(jobName, data, opts),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Queue dispatch timeout")), 1500))
      ]);
      return job;
    } catch (err) {
      console.warn(`[Queue] Failed to dispatch job ${jobName} via BullMQ, invoking fallback:`, err.message);
    }
  }
  if (fallbackFn) {
    return await fallbackFn();
  }
  return null;
}

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 200 },
};

// 1. Chess.com Profile Sync & Game Analysis Queue
export const syncQueue = new Queue("chesscom-sync", {
  connection: redisConfig,
  defaultJobOptions,
});

// 2. Feature Generation Queue
export const featureQueue = new Queue("feature-generation", {
  connection: redisConfig,
  defaultJobOptions,
});

// 3. Dataset Generation Queue
export const datasetQueue = new Queue("dataset-generation", {
  connection: redisConfig,
  defaultJobOptions,
});

// 4. Model Training Queue (Current Self & Peak Self)
export const trainingQueue = new Queue("model-training", {
  connection: redisConfig,
  defaultJobOptions,
});

// 5. Model Continuous Retraining Queue
export const retrainingQueue = new Queue("model-retraining", {
  connection: redisConfig,
  defaultJobOptions,
});

// Backward compatibility export
export const currentSelfTrainingQueue = trainingQueue;

export async function closeAllQueues() {
  await Promise.allSettled([
    syncQueue.close(),
    featureQueue.close(),
    datasetQueue.close(),
    trainingQueue.close(),
    retrainingQueue.close(),
  ]);
  console.log("[Queues] All BullMQ queues closed.");
}
