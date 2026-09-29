import { Router } from "express";
import { z } from "zod";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { authenticate } from "../middleware/auth.js";
import { PlayService } from "../services/play/service.js";

const router = Router();

const createSessionSchema = z.object({
  opponentType: z.enum(["CURRENT_SELF", "PEAK_SELF"]),
  color: z.enum(["WHITE", "BLACK"]),
});

const submitMoveSchema = z.object({
  move: z.object({
    from: z.string().length(2),
    to: z.string().length(2),
    promotion: z.string().optional(),
  }),
});

router.post("/sessions", authenticate, async (req, res) => {
  const result = createSessionSchema.safeParse(req.body);
  if (!result.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid session payload", 400, result.error.format());
  }

  const { opponentType, color } = result.data;
  try {
    const session = await PlayService.createSession(req.user.userId, opponentType, color);
    return sendSuccess(res, session, 201);
  } catch (err) {
    return sendError(res, "PLAY_SESSION_ERROR", err.message || "Failed to create play session.", 400);
  }
});

router.post("/sessions/:sessionId/moves", authenticate, async (req, res) => {
  const result = submitMoveSchema.safeParse(req.body);
  if (!result.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid move format", 400, result.error.format());
  }

  const { move } = result.data;
  try {
    const moveRes = await PlayService.submitMove(req.user.userId, req.params.sessionId, move);
    return sendSuccess(res, moveRes);
  } catch (err) {
    if (err.message === "INVALID_MOVE") {
      return sendError(res, "INVALID_MOVE", "The move specified is illegal in the current board position.", 400);
    }
    return sendError(res, "PLAY_MOVE_ERROR", err.message || "Failed to process move.", 400);
  }
});

router.post("/sessions/:sessionId/resign", authenticate, async (req, res) => {
  try {
    const resObj = await PlayService.resignSession(req.user.userId, req.params.sessionId);
    return sendSuccess(res, resObj);
  } catch (err) {
    return sendError(res, "PLAY_RESIGN_ERROR", err.message || "Failed to resign session.", 400);
  }
});

export default router;
