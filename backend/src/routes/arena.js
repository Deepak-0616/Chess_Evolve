import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

// GET /api/v1/arena/players
router.get("/players", authenticateSupabaseUser, async (req, res) => {
  try {
    const arenaProfiles = await prisma.arenaProfile.findMany({
      where: {
        visibility: { in: ["PUBLIC", "DISCOVERABLE"] },
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            chessProfile: {
              select: {
                chessUsername: true,
                title: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { rating: "desc" },
      take: 50,
    });

    return res.json({ players: arenaProfiles });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch arena players", details: err.message });
  }
});

// GET /api/v1/arena/players/:playerId
router.get("/players/:playerId", authenticateSupabaseUser, async (req, res) => {
  try {
    const { playerId } = req.params;

    const profile = await prisma.arenaProfile.findUnique({
      where: { userId: playerId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            chessProfile: {
              select: {
                chessUsername: true,
                title: true,
                avatarUrl: true,
                joinedAt: true,
              },
            },
            modelVersions: {
              where: { status: "READY" },
              select: {
                id: true,
                modelType: true,
                version: true,
                metrics: true,
                trainedAt: true,
              },
            },
          },
        },
      },
    });

    if (!profile || profile.visibility === "PRIVATE") {
      return res
        .status(404)
        .json({ error: "Player profile is private or not found in Arena" });
    }

    return res.json({ player: profile });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch player details", details: err.message });
  }
});

// POST /api/v1/arena/sessions
router.post("/sessions", authenticateSupabaseUser, async (req, res) => {
  try {
    const challengerUserId = req.user.id;
    const { targetUserId, targetModelType = "CURRENT_SELF" } = req.body;

    const targetArenaProfile = await prisma.arenaProfile.findUnique({
      where: { userId: targetUserId },
    });

    if (!targetArenaProfile || targetArenaProfile.visibility === "PRIVATE") {
      return res
        .status(403)
        .json({
          error: "Target model is private or unavailable for Arena play",
        });
    }

    const targetModelVersion = await prisma.mLModelVersion.findFirst({
      where: {
        userId: targetUserId,
        modelType: targetModelType,
        status: "READY",
      },
      orderBy: { version: "desc" },
    });

    if (!targetModelVersion) {
      return res
        .status(400)
        .json({ error: "Target user model is not ready for Arena match" });
    }

    const initialFen =
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    const session = await prisma.arenaSession.create({
      data: {
        challengerUserId,
        targetUserId,
        targetModelType,
        targetModelVersionId: targetModelVersion.id,
        status: "IN_PROGRESS",
        fen: initialFen,
        pgn: "",
        moveHistory: [],
      },
    });

    return res.json({ session });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to create Arena session", details: err.message });
  }
});

export default router;
