"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const apiResponse_1 = require("../utils/apiResponse");
const auth_1 = require("../middleware/auth");
const service_1 = require("../services/coach/service");
const router = (0, express_1.Router)();
const chatSchema = zod_1.z.object({
    message: zod_1.z.string().min(1),
    conversationId: zod_1.z.string().optional(),
});
router.post("/chat", auth_1.authenticate, async (req, res) => {
    const result = chatSchema.safeParse(req.body);
    if (!result.success) {
        return (0, apiResponse_1.sendError)(res, "VALIDATION_ERROR", "Message cannot be empty", 400, result.error.format());
    }
    const { message, conversationId } = result.data;
    try {
        const coachRes = await service_1.CoachService.askCoach(req.user.userId, message, conversationId);
        return (0, apiResponse_1.sendSuccess)(res, coachRes);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, "COACH_ERROR", err.message || "AI Coach query failed.", 400);
    }
});
exports.default = router;
