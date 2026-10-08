import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";
import { CoachService } from "../services/coach/CoachService.js";

const router = Router();

// In-memory cache for coach insights (<2ms)
const coachInsightsCache = new Map();
export const invalidateCoachCache = (userId) => {
  if (userId) coachInsightsCache.delete(userId);
  else coachInsightsCache.clear();
};

// GET /api/v1/coach/insights
router.get("/insights", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const cached = coachInsightsCache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
      return res.json(cached.payload);
    }

    const insights = await CoachService.getInsights(userId);
    coachInsightsCache.set(userId, { payload: insights, expiresAt: Date.now() + 30000 });
    return res.json(insights);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to generate insights", details: err.message });
  }
});

// GET /api/v1/coach/conversations
router.get("/conversations", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await prisma.coachConversation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return res.json({ conversations });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch conversations", details: err.message });
  }
});

// GET /api/v1/coach/conversations/:id
router.get("/conversations/:id", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const conversation = await prisma.coachConversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!conversation || conversation.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json({ conversation });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch conversation", details: err.message });
  }
});

// POST /api/v1/coach/chat
router.post("/chat", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, conversationId, gameId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const reply = await CoachService.handleChat(userId, message, conversationId, gameId);
    return res.json(reply);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to process chat", details: err.message });
  }
});

// POST /api/v1/coach/game-review
router.post("/game-review", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { gameId } = req.body;

    if (!gameId) {
      return res.status(400).json({ error: "Game ID is required" });
    }

    // Pass an introductory message to handleChat with the game context
    const message = "Please review this game. Why did I lose or what were my biggest mistakes?";
    const reply = await CoachService.handleChat(userId, message, null, gameId);
    return res.json(reply);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to review game", details: err.message });
  }
});

export default router;
