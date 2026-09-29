"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const apiResponse_1 = require("../utils/apiResponse");
const auth_1 = require("../middleware/auth");
const service_1 = require("../services/training/service");
const router = (0, express_1.Router)();
const startSessionSchema = zod_1.z.object({
    category: zod_1.z.string(),
    topic: zod_1.z.string(),
    positionCount: zod_1.z.number().optional().default(5),
});
const submitAttemptSchema = zod_1.z.object({
    positionId: zod_1.z.string(),
    move: zod_1.z.object({
        from: zod_1.z.string().length(2),
        to: zod_1.z.string().length(2),
    }),
    timeSpentMs: zod_1.z.number().optional().default(1000),
});
router.get("/recommendations", auth_1.authenticate, async (req, res) => {
    try {
        const recs = await service_1.TrainingService.getRecommendations(req.user.userId);
        return (0, apiResponse_1.sendSuccess)(res, recs);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, "TRAINING_ERROR", err.message || "Failed to load recommendations.", 400);
    }
});
router.post("/sessions", auth_1.authenticate, async (req, res) => {
    const parseResult = startSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
        return (0, apiResponse_1.sendError)(res, "VALIDATION_ERROR", "Invalid training session payload", 400, parseResult.error.format());
    }
    const { category, topic, positionCount } = parseResult.data;
    try {
        const sessionData = await service_1.TrainingService.startSession(req.user.userId, category, topic, positionCount);
        return (0, apiResponse_1.sendSuccess)(res, sessionData, 201);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, "TRAINING_ERROR", err.message || "Failed to start training session.", 400);
    }
});
router.post("/sessions/:sessionId/attempts", auth_1.authenticate, async (req, res) => {
    const parseResult = submitAttemptSchema.safeParse(req.body);
    if (!parseResult.success) {
        return (0, apiResponse_1.sendError)(res, "VALIDATION_ERROR", "Invalid attempt payload", 400, parseResult.error.format());
    }
    const { positionId, move, timeSpentMs } = parseResult.data;
    try {
        const result = await service_1.TrainingService.submitAttempt(req.user.userId, req.params.sessionId, positionId, move, timeSpentMs);
        return (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, "TRAINING_ERROR", err.message || "Failed to submit attempt.", 400);
    }
});
exports.default = router;
