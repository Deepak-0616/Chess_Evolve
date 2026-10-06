import { Worker } from "bullmq";
import { redisConfig } from "../utils/redis.js";
import { AccountSyncManager } from "../services/jobs/syncJob.js";
import { prisma } from "../utils/prisma.js";

export const syncWorker = new Worker(
  "chesscom-sync",
  async (job) => {
    const { userId, chessUsername } = job.data;
    console.log(`[SyncWorker] Starting sync for user ${userId} (${chessUsername}) [Job ${job.id}]`);

    try {
      await job.updateProgress(10);
      const result = await AccountSyncManager.executeFullSync(userId, chessUsername);
      await job.updateProgress(100);
      return { success: true, result };
    } catch (err) {
      console.error(`[SyncWorker] Job ${job.id} failed:`, err.message);
      // Persist failure state in database
      await prisma.chessProfile.update({
        where: { userId },
        data: {
          syncStatus: "FAILED",
          syncProgress: {
            stage: "FAILED",
            error: err.message,
            failedAt: new Date().toISOString(),
          },
        },
      });
      throw err;
    }
  },
  {
    connection: redisConfig,
    concurrency: 2, // Limit concurrent syncs to respect Chess.com PubAPI rate limits
  }
);

syncWorker.on("completed", (job) => {
  console.log(`[SyncWorker] Job ${job.id} completed successfully.`);
});

syncWorker.on("failed", (job, err) => {
  console.warn(`[SyncWorker] Job ${job?.id} failed on attempt ${job?.attemptsMade}: ${err.message}`);
});
