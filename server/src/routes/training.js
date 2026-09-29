import { Router } from "express";
import { z } from "zod";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { authenticate } from "../middleware/auth.js";
import { TrainingService } from "../services/training/service.js";

const router = Router();

const startSessionSchema = z.object({
  category: z.string(),
  topic: z.string(),
  positionCount: z.number().optional().default(5),
});

const submitAttemptSchema = z.object({
  positionId: z.string(),
  move: z.object({
    from: z.string().length(2),
    to: z.string().length(2),
  }),
  timeSpentMs: z.number().optional().default(1000),
});

router.get("/recommendations", authenticate, async (req, res) => {
  try {
    const recs = await TrainingService.getRecommendations(req.user.userId);
    return sendSuccess(res, recs);
  } catch (err) {
    return sendError(res, "TRAINING_ERROR", err.message || "Failed to load recommendations.", 400);
  }
});

router.post("/sessions", authenticate, async (req, res) => {
  const parseResult = startSessionSchema.safeParse(req.body);
  if (!parseResult.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid training session payload", 400, parseResult.error.format());
  }

  const { category, topic, positionCount } = parseResult.data;
  try {
    const sessionData = await TrainingService.startSession(req.user.userId, category, topic, positionCount);
    return sendSuccess(res, sessionData, 201);
  } catch (err) {
    return sendError(res, "TRAINING_ERROR", err.message || "Failed to start training session.", 400);
  }
});

router.post("/sessions/:sessionId/attempts", authenticate, async (req, res) => {
  const parseResult = submitAttemptSchema.safeParse(req.body);
  if (!parseResult.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid attempt payload", 400, parseResult.error.format());
  }

  const { positionId, move, timeSpentMs } = parseResult.data;
  try {
    const result = await TrainingService.submitAttempt(req.user.userId, req.params.sessionId, positionId, move, timeSpentMs);
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, "TRAINING_ERROR", err.message || "Failed to submit attempt.", 400);
  }
});

export default router;
