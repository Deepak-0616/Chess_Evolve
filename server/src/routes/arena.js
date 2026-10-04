import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const prisma = new PrismaClient();

// List / Search public AI profiles
router.get("/players", authenticate, async (req, res) => {
  try {
    const { query, minRating, maxRating } = req.query;

    const whereClause = {
      aiVisibility: { in: ["PUBLIC", "DISCOVERABLE"] },
    };

    if (query && typeof query === "string") {
      whereClause.username = { contains: query.toLowerCase() };
    }

    const profiles = await prisma.chessProfile.findMany({
      where: whereClause,
      take: 50,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        userId: true,
        username: true,
        avatarUrl: true,
        title: true,
        country: true,
        aiVisibility: true,
        aiRatingCurrentSelf: true,
        aiRatingPeakSelf: true,
        user: {
          select: {
            displayName: true,
            avatarUrl: true,
          }
        }
      }
    });

    const playerList = await Promise.all(
      profiles.map(async (p) => {
        const models = await prisma.mLModelVersion.findMany({
          where: { userId: p.userId, status: "READY" },
          select: { modelType: true, version: true }
        });

        const currentSelfReady = models.some(m => m.modelType === "CURRENT_SELF");
        const peakSelfReady = models.some(m => m.modelType === "PEAK_SELF");

        return {
          id: p.id,
          userId: p.userId,
          username: p.username,
          displayName: p.user?.displayName || p.username,
          avatarUrl: p.avatarUrl || p.user?.avatarUrl,
          title: p.title,
          country: p.country,
          aiRatingCurrentSelf: p.aiRatingCurrentSelf,
          aiRatingPeakSelf: p.aiRatingPeakSelf,
          currentSelfAvailable: currentSelfReady,
          peakSelfAvailable: peakSelfReady,
          isSelf: p.userId === req.user.id
        };
      })
    );

    return sendSuccess(res, playerList);
  } catch (err) {
    return sendError(res, "ARENA_FETCH_FAILED", err.message, 500);
  }
});

// Get specific player AI profile
router.get("/players/:playerId", authenticate, async (req, res) => {
  try {
    const { playerId } = req.params;

    const profile = await prisma.chessProfile.findFirst({
      where: {
        OR: [
          { id: playerId },
          { userId: playerId },
          { username: playerId }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          }
        }
      }
    });

    if (!profile) {
      return sendError(res, "PLAYER_NOT_FOUND", "AI Arena player profile not found.", 404);
    }

    // Server-side ownership/privacy check
    if (profile.userId !== req.user.id && profile.aiVisibility === "PRIVATE") {
      return sendError(res, "PRIVATE_AI_MODEL", "This player's AI profile is set to private.", 403);
    }

    const models = await prisma.mLModelVersion.findMany({
      where: { userId: profile.userId, status: "READY" },
      orderBy: { version: "desc" }
    });

    const currentSelf = models.find(m => m.modelType === "CURRENT_SELF");
    const peakSelf = models.find(m => m.modelType === "PEAK_SELF");

    const sessionCount = await prisma.playSession.count({
      where: { opponentUserId: profile.userId }
    });

    return sendSuccess(res, {
      player: {
        id: profile.id,
        userId: profile.userId,
        username: profile.username,
        displayName: profile.user?.displayName || profile.username,
        avatarUrl: profile.avatarUrl || profile.user?.avatarUrl,
        title: profile.title,
        country: profile.country,
        aiVisibility: profile.aiVisibility,
        aiRatingCurrentSelf: profile.aiRatingCurrentSelf,
        aiRatingPeakSelf: profile.aiRatingPeakSelf,
        totalGamesPlayedAgainst: sessionCount
      },
      models: {
        currentSelf: currentSelf ? {
          available: true,
          version: currentSelf.version,
          metrics: currentSelf.metrics ? JSON.parse(currentSelf.metrics) : null
        } : { available: false },
        peakSelf: peakSelf ? {
          available: true,
          version: peakSelf.version,
          metrics: peakSelf.metrics ? JSON.parse(peakSelf.metrics) : null
        } : { available: false }
      }
    });
  } catch (err) {
    return sendError(res, "PLAYER_FETCH_FAILED", err.message, 500);
  }
});

// Start AI Arena Session against another player's model
router.post("/sessions", authenticate, async (req, res) => {
  try {
    const { targetUserId, opponentType, color } = req.body;

    const targetProfile = await prisma.chessProfile.findFirst({
      where: { OR: [{ userId: targetUserId }, { id: targetUserId }, { username: targetUserId }] }
    });

    if (!targetProfile) {
      return sendError(res, "PLAYER_NOT_FOUND", "Target AI player not found.", 404);
    }

    if (targetProfile.userId !== req.user.id && targetProfile.aiVisibility === "PRIVATE") {
      return sendError(res, "PRIVATE_AI_MODEL", "Target AI model is private.", 403);
    }

    const modelType = (opponentType || "CURRENT_SELF").toUpperCase();
    const model = await prisma.mLModelVersion.findFirst({
      where: { userId: targetProfile.userId, modelType, status: "READY" },
      orderBy: { version: "desc" }
    });

    const playerColor = (color || "WHITE").toUpperCase();

    const session = await prisma.playSession.create({
      data: {
        userId: req.user.id,
        opponentUserId: targetProfile.userId,
        opponentType: modelType,
        opponentModelVersion: model ? model.version : 1,
        color: playerColor,
        status: "ACTIVE",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        pgn: ""
      }
    });

    return sendSuccess(res, {
      sessionId: session.id,
      opponent: {
        username: targetProfile.username,
        title: targetProfile.title,
        avatarUrl: targetProfile.avatarUrl,
        opponentType: modelType,
        aiRating: modelType === "PEAK_SELF" ? targetProfile.aiRatingPeakSelf : targetProfile.aiRatingCurrentSelf
      },
      session
    }, 201);
  } catch (err) {
    return sendError(res, "ARENA_SESSION_FAILED", err.message, 500);
  }
});

export default router;
