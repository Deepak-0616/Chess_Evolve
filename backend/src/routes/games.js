import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";
import { AccountSyncManager } from "../services/jobs/syncJob.js";

const router = Router();

// GET /api/v1/games
router.get("/", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeClass, result, rated, limit = "50", page = "1" } = req.query;

    const userProfile = await prisma.chessProfile.findUnique({
      where: { userId },
    });

    if (!userProfile) {
      return res.json({ games: [], total: 0 });
    }

    // Auto-sync latest games on page 1 if not synced in the last 15s
    const isInitialPage = (!page || page === "1") && !timeClass && !result && !rated;
    const lastSyncedTime = userProfile.lastSyncedAt ? new Date(userProfile.lastSyncedAt).getTime() : 0;
    if (isInitialPage && Date.now() - lastSyncedTime > 15000) {
      await AccountSyncManager.syncLatestGames(userId, userProfile.chessUsername).catch((e) => {
        console.warn("[games] Quick sync latest games error:", e.message);
      });
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
    if (rated !== undefined && rated !== "all") {
      whereClause.rated = rated === "true" || rated === true;
    }

    const pageSize = parseInt(limit, 10) || 50;
    const pageNum = parseInt(page, 10) || 1;

    const [total, games] = await Promise.all([
      prisma.game.count({ where: whereClause }),
      prisma.game.findMany({
        where: whereClause,
        orderBy: { playedAt: "desc" },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        include: {
          gameAnalysis: true,
        },
      }),
    ]);

    const formattedGames = games.map((g) => {
      const isWhite = g.userColor === "WHITE";
      const userResult = (g.result || "").toUpperCase();
      let scoreResult = "1/2-1/2";
      if (userResult === "WIN") {
        scoreResult = isWhite ? "1-0" : "0-1";
      } else if (userResult === "LOSS") {
        scoreResult = isWhite ? "0-1" : "1-0";
      }

      let moveCount = 0;
      if (g.pgn) {
        const moveMatches = g.pgn.match(/\b\d+\./g);
        moveCount = moveMatches ? moveMatches.length : 0;
      }

      let openingName = g.gameAnalysis?.openingName;
      let openingEco = g.gameAnalysis?.openingEco;
      if (!openingName && g.pgn) {
        const ecoUrlMatch = g.pgn.match(/\[ECOUrl "https:\/\/www\.chess\.com\/openings\/(.*?)"\]/);
        if (ecoUrlMatch) {
          openingName = decodeURIComponent(ecoUrlMatch[1].replace(/-/g, " ").replace(/\.{3}$/, ""));
        } else {
          const opMatch = g.pgn.match(/\[Opening "(.*?)"\]/);
          if (opMatch) openingName = opMatch[1];
        }
      }
      if (!openingEco && g.pgn) {
        const ecoMatch = g.pgn.match(/\[ECO "(.*?)"\]/);
        if (ecoMatch) openingEco = ecoMatch[1];
      }

      return {
        ...g,
        id: g.id,
        white: isWhite ? "You" : g.whiteUsername,
        black: isWhite ? g.blackUsername : "You",
        whiteUsername: g.whiteUsername,
        blackUsername: g.blackUsername,
        isWhite,
        userColor: g.userColor,
        opponent: g.opponentUsername,
        opponentUsername: g.opponentUsername,
        opponentRating: g.opponentRating,
        myRating: g.userRating,
        userRating: g.userRating,
        date: g.playedAt,
        playedAt: g.playedAt,
        result: scoreResult,
        resultText: userResult,
        timeControl: g.timeClass ? g.timeClass.charAt(0).toUpperCase() + g.timeClass.slice(1) : g.timeControl,
        moves: moveCount || 20,
        accuracy: g.gameAnalysis?.accuracy ? Math.round(g.gameAnalysis.accuracy * 10) / 10 : 75.0,
        avgCpLoss: g.gameAnalysis?.avgCpLoss || 30.0,
        opening: openingName || "Standard Chess",
        openingEco: openingEco || "A00",
        rated: g.rated !== false,
      };
    });

    return res.json({
      games: formattedGames,
      data: { games: formattedGames },
      total,
      page: pageNum,
      pageSize,
    });
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
