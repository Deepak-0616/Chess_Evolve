"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const apiResponse_1 = require("../utils/apiResponse");
const auth_1 = require("../middleware/auth");
const service_1 = require("../services/play/service");
const router = (0, express_1.Router)();
const createSessionSchema = zod_1.z.object({
    opponentType: zod_1.z.enum(["CURRENT_SELF", "PEAK_SELF"]),
    color: zod_1.z.enum(["WHITE", "BLACK"]),
});
const submitMoveSchema = zod_1.z.object({
    move: zod_1.z.object({
        from: zod_1.z.string().length(2),
        to: zod_1.z.string().length(2),
        promotion: zod_1.z.string().optional(),
    }),
});
router.post("/sessions", auth_1.authenticate, async (req, res) => {
    const result = createSessionSchema.safeParse(req.body);
    if (!result.success) {
        return (0, apiResponse_1.sendError)(res, "VALIDATION_ERROR", "Invalid session payload", 400, result.error.format());
    }
    const { opponentType, color } = result.data;
    try {
        const session = await service_1.PlayService.createSession(req.user.userId, opponentType, color);
        return (0, apiResponse_1.sendSuccess)(res, session, 201);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, "PLAY_SESSION_ERROR", err.message || "Failed to create play session.", 400);
    }
});
router.post("/sessions/:sessionId/moves", auth_1.authenticate, async (req, res) => {
    const result = submitMoveSchema.safeParse(req.body);
    if (!result.success) {
        return (0, apiResponse_1.sendError)(res, "VALIDATION_ERROR", "Invalid move format", 400, result.error.format());
    }
    const { move } = result.data;
    try {
        const moveRes = await service_1.PlayService.submitMove(req.user.userId, req.params.sessionId, move);
        return (0, apiResponse_1.sendSuccess)(res, moveRes);
    }
    catch (err) {
        if (err.message === "INVALID_MOVE") {
            return (0, apiResponse_1.sendError)(res, "INVALID_MOVE", "The move specified is illegal in the current board position.", 400);
        }
        return (0, apiResponse_1.sendError)(res, "PLAY_MOVE_ERROR", err.message || "Failed to process move.", 400);
    }
});
router.post("/sessions/:sessionId/resign", auth_1.authenticate, async (req, res) => {
    try {
        const resObj = await service_1.PlayService.resignSession(req.user.userId, req.params.sessionId);
        return (0, apiResponse_1.sendSuccess)(res, resObj);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, "PLAY_RESIGN_ERROR", err.message || "Failed to resign session.", 400);
    }
});
exports.default = router;
