import { Router } from "express";
import { z } from "zod";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { authenticate } from "../middleware/auth.js";
import { CoachService } from "../services/coach/service.js";

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
});

router.post("/chat", authenticate, async (req, res) => {
  const result = chatSchema.safeParse(req.body);
  if (!result.success) {
    return sendError(res, "VALIDATION_ERROR", "Message cannot be empty", 400, result.error.format());
  }

  const { message, conversationId } = result.data;
  try {
    const coachRes = await CoachService.askCoach(req.user.userId, message, conversationId);
    return sendSuccess(res, coachRes);
  } catch (err) {
    return sendError(res, "COACH_ERROR", err.message || "AI Coach query failed.", 400);
  }
});

export default router;
