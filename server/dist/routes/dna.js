"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const apiResponse_1 = require("../utils/apiResponse");
const auth_1 = require("../middleware/auth");
const service_1 = require("../services/dna/service");
const router = (0, express_1.Router)();
router.get("/current", auth_1.authenticate, async (req, res) => {
    try {
        const dna = await service_1.ChessDNAService.getCurrentDNA(req.user.userId);
        return (0, apiResponse_1.sendSuccess)(res, dna);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, "DNA_NOT_AVAILABLE", err.message || "Failed to retrieve Chess DNA.", 400);
    }
});
router.get("/history", auth_1.authenticate, async (req, res) => {
    try {
        const history = await service_1.ChessDNAService.getHistory(req.user.userId);
        return (0, apiResponse_1.sendSuccess)(res, history);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, "DNA_NOT_AVAILABLE", err.message || "Failed to retrieve Chess DNA history.", 400);
    }
});
exports.default = router;
