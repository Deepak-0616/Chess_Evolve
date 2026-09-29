import { Router } from "express";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { authenticate } from "../middleware/auth.js";
import { PeakSelfService } from "../services/peak-self/service.js";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const peak = await PeakSelfService.getCurrentPeakSelf(req.user.userId);
    return sendSuccess(res, peak);
  } catch (err) {
    return sendError(res, "PEAK_SELF_NOT_AVAILABLE", err.message || "Failed to retrieve Peak Self.", 400);
  }
});

router.post("/generate", authenticate, async (req, res) => {
  try {
    const peak = await PeakSelfService.generatePeakSelf(req.user.userId);
    return sendSuccess(res, peak, 202);
  } catch (err) {
    return sendError(res, "PEAK_SELF_GENERATION_FAILED", err.message || "Failed to generate Peak Self.", 400);
  }
});

export default router;
