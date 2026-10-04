import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

// GET /api/v1/games
router.get("/", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeClass, result, limit = "50", page = "1" } = req.query;

    const userProfile = await prisma.chessProfile.findUnique({
      where: { userId },
    });

    if (!userProfile) {
      return res.json({ games: [], total: 0 });
    }

    const whereClause = {
      chessProfileId: userProfile.id,
    };

    if (timeClass && typeof timeClass === "string") {
      whereClause.timeClass = timeClass.toLowerCase();
    }
    if (result && typeof result === "string") {
      whereClause.result = result.toUpperCase();
    }

    const pageSize = parseInt(limit, 10) || 50;
    const pageNum = parseInt(page, 10) || 1;

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where: whereClause,
        include: { gameAnalysis: true },
        orderBy: { playedAt: "desc" },
        take: pageSize,
        skip: (pageNum - 1) * pageSize,
      }),
      prisma.game.count({ where: whereClause }),
    ]);

    return res.json({ games, total, page: pageNum, pageSize });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch games", details: err.message });
  }
});

// GET /api/v1/games/:gameId
router.get("/:gameId", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { gameId } = req.params;

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        chessProfile: true,
        gameAnalysis: true,
        positionAnalyses: {
          orderBy: { ply: "asc" },
        },
      },
    });

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    // Security ownership check: verify game belongs to connected user
    if (game.chessProfile.userId !== userId) {
      return res
        .status(403)
        .json({ error: "Unauthorized access to private game records" });
    }

    return res.json({ game });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch game details", details: err.message });
  }
});

// GET /api/v1/games/:gameId/analysis
router.get("/:gameId/analysis", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { gameId } = req.params;

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        chessProfile: true,
        gameAnalysis: true,
        positionAnalyses: {
          orderBy: { ply: "asc" },
        },
      },
    });

    if (!game || game.chessProfile.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized or game not found" });
    }

    return res.json({
      gameAnalysis: game.gameAnalysis,
      positionAnalyses: game.positionAnalyses,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch game analysis", details: err.message });
  }
});

export default router;
