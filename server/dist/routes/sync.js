"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const apiResponse_1 = require("../utils/apiResponse");
const auth_1 = require("../middleware/auth");
const syncJob_1 = require("../services/jobs/syncJob");
const router = (0, express_1.Router)();
const syncSchema = zod_1.z.object({
    fullSync: zod_1.z.boolean().optional().default(false),
});
router.post("/", auth_1.authenticate, async (req, res) => {
    const parseResult = syncSchema.safeParse(req.body);
    const fullSync = parseResult.success ? parseResult.data.fullSync : false;
    try {
        const jobRes = await syncJob_1.SyncJobManager.startSyncJob(req.user.userId, fullSync);
        return (0, apiResponse_1.sendSuccess)(res, jobRes, 202);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, "CHESS_SYNC_FAILED", err.message || "Failed to initiate sync job.", 400);
    }
});
router.get("/:jobId", auth_1.authenticate, async (req, res) => {
    try {
        const status = await syncJob_1.SyncJobManager.getJobStatus(req.params.jobId, req.user.userId);
        return (0, apiResponse_1.sendSuccess)(res, status);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, "JOB_NOT_FOUND", err.message || "Sync job not found.", 404);
    }
});
exports.default = router;
