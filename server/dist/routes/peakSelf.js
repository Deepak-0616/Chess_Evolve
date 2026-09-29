"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const apiResponse_1 = require("../utils/apiResponse");
const auth_1 = require("../middleware/auth");
const service_1 = require("../services/peak-self/service");
const router = (0, express_1.Router)();
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const peak = await service_1.PeakSelfService.getCurrentPeakSelf(req.user.userId);
        return (0, apiResponse_1.sendSuccess)(res, peak);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, "PEAK_SELF_NOT_AVAILABLE", err.message || "Failed to retrieve Peak Self.", 400);
    }
});
router.post("/generate", auth_1.authenticate, async (req, res) => {
    try {
        const peak = await service_1.PeakSelfService.generatePeakSelf(req.user.userId);
        return (0, apiResponse_1.sendSuccess)(res, peak, 202);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, "PEAK_SELF_GENERATION_FAILED", err.message || "Failed to generate Peak Self.", 400);
    }
});
exports.default = router;
