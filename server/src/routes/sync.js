import { Router } from "express";
import { z } from "zod";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { authenticate } from "../middleware/auth.js";
import { SyncJobManager } from "../services/jobs/syncJob.js";

const router = Router();

const syncSchema = z.object({
  fullSync: z.boolean().optional().default(false),
});

router.post("/", authenticate, async (req, res) => {
  const parseResult = syncSchema.safeParse(req.body);
  const fullSync = parseResult.success ? parseResult.data.fullSync : false;

  try {
    const jobRes = await SyncJobManager.startSyncJob(req.user.userId, fullSync);
    return sendSuccess(res, jobRes, 202);
  } catch (err) {
    return sendError(res, "CHESS_SYNC_FAILED", err.message || "Failed to initiate sync job.", 400);
  }
});

router.get("/:jobId", authenticate, async (req, res) => {
  try {
    const status = await SyncJobManager.getJobStatus(req.params.jobId, req.user.userId);
    return sendSuccess(res, status);
  } catch (err) {
    return sendError(res, "JOB_NOT_FOUND", err.message || "Sync job not found.", 404);
  }
});

export default router;
