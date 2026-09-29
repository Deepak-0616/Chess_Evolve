import { Router } from "express";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { authenticate } from "../middleware/auth.js";
import { ChessDNAService } from "../services/dna/service.js";

const router = Router();

router.get("/current", authenticate, async (req, res) => {
  try {
    const dna = await ChessDNAService.getCurrentDNA(req.user.userId);
    return sendSuccess(res, dna);
  } catch (err) {
    return sendError(res, "DNA_NOT_AVAILABLE", err.message || "Failed to retrieve Chess DNA.", 400);
  }
});

router.get("/history", authenticate, async (req, res) => {
  try {
    const history = await ChessDNAService.getHistory(req.user.userId);
    return sendSuccess(res, history);
  } catch (err) {
    return sendError(res, "DNA_NOT_AVAILABLE", err.message || "Failed to retrieve Chess DNA history.", 400);
  }
});

export default router;
