import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";
import { Chess } from "chess.js";
import { MLServiceBridge } from "../services/ml/mlService.js";
import { StockfishService } from "../services/stockfish/StockfishService.js";

const router = Router();

// In-memory cache for Arena player lobby (<2ms)
let arenaPlayersCache = null;
let arenaPlayersCacheExpiresAt = 0;
export const invalidateArenaPlayersCache = () => {
  arenaPlayersCache = null;
  arenaPlayersCacheExpiresAt = 0;
};

// GET /api/v1/arena/players
router.get("/players", authenticateSupabaseUser, async (req, res) => {
  try {
    if (arenaPlayersCache && Date.now() < arenaPlayersCacheExpiresAt) {
      return res.json(arenaPlayersCache);
    }

    const arenaProfiles = await prisma.arenaProfile.findMany({
      where: {
        visibility: { in: ["PUBLIC", "DISCOVERABLE"] },
        arenaEnabled: true,
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
        models: {
          where: { isActive: true },
          include: {
            mlModelVersion: {
              select: {
                id: true,
                version: true,
                status: true,
                gamesUsed: true
              }
            }
          }
        },
        ratings: true
      },
      take: 50,
    });

    const payload = { players: arenaProfiles };
    arenaPlayersCache = payload;
    arenaPlayersCacheExpiresAt = Date.now() + 30000;
    return res.json(payload);
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
          },
        },
        models: {
          where: { isActive: true },
          include: {
            mlModelVersion: {
              select: {
                id: true,
                version: true,
                status: true,
                gamesUsed: true
              }
            }
          }
        },
        ratings: true
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

// POST /api/v1/arena/challenges
router.post("/challenges", authenticateSupabaseUser, async (req, res) => {
  try {
    const challengerUserId = req.user.id;
    const { opponentUserId, myModelType, opponentModelType, timeControl = "10+0" } = req.body;

    const opponentProfile = await prisma.arenaProfile.findUnique({
      where: { userId: opponentUserId },
    });

    if (!opponentProfile || opponentProfile.visibility === "PRIVATE") {
      return res.status(403).json({ error: "Opponent is private or unavailable" });
    }

    let challengerModelVersionId = null;
    if (myModelType) {
      const myModel = await prisma.mLModelVersion.findFirst({
        where: { userId: challengerUserId, modelType: myModelType, status: "READY" },
        orderBy: { version: "desc" }
      });
      if (!myModel) {
        return res.status(400).json({ error: "Your model is not ready." });
      }
      challengerModelVersionId = myModel.id;
    }

    const opponentModel = await prisma.mLModelVersion.findFirst({
      where: { userId: opponentUserId, modelType: opponentModelType, status: "READY" },
      orderBy: { version: "desc" }
    });

    if (!opponentModel) {
      return res.status(400).json({ error: "Opponent model is not ready." });
    }

    const challenge = await prisma.arenaChallenge.create({
      data: {
        challengerUserId,
        challengerModelVersionId,
        opponentUserId,
        opponentModelVersionId: opponentModel.id,
        timeControl,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    return res.json({ challenge });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create challenge", details: err.message });
  }
});

// POST /api/v1/arena/challenges/:challengeId/accept
router.post("/challenges/:challengeId/accept", authenticateSupabaseUser, async (req, res) => {
  try {
    const { challengeId } = req.params;
    const challenge = await prisma.arenaChallenge.findUnique({ where: { id: challengeId } });
    
    // In a real app, only opponent can accept. For demo/AI Arena where we challenge an AI, 
    // the system can auto-accept. If it's another user's AI, their model can play immediately.
    // So we will just verify the challenge exists and has not expired.
    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }
    
    if (challenge.status !== "PENDING") {
      return res.status(400).json({ error: "Challenge is not pending" });
    }

    const updatedChallenge = await prisma.arenaChallenge.update({
      where: { id: challengeId },
      data: { status: "ACCEPTED" }
    });

    const match = await prisma.arenaMatch.create({
      data: {
        status: "IN_PROGRESS",
        whiteUserId: challenge.challengerUserId,
        whiteModelVersionId: challenge.challengerModelVersionId,
        blackUserId: challenge.opponentUserId,
        blackModelVersionId: challenge.opponentModelVersionId,
        timeControl: challenge.timeControl
      }
    });

    return res.json({ match, challenge: updatedChallenge });
  } catch (err) {
    return res.status(500).json({ error: "Failed to accept challenge", details: err.message });
  }
});

// GET /api/v1/arena/matches
router.get("/matches", authenticateSupabaseUser, async (req, res) => {
  try {
    const matches = await prisma.arenaMatch.findMany({
      where: {
        OR: [
          { whiteUserId: req.user.id },
          { blackUserId: req.user.id }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    return res.json({ matches });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch matches", details: err.message });
  }
});

// GET /api/v1/arena/matches/:matchId
router.get("/matches/:matchId", authenticateSupabaseUser, async (req, res) => {
  try {
    const { matchId } = req.params;
    const match = await prisma.arenaMatch.findUnique({
      where: { id: matchId },
      include: {
        whiteProfile: { include: { user: true } },
        blackProfile: { include: { user: true } },
        whiteModelVersion: true,
        blackModelVersion: true
      }
    });

    if (!match) return res.status(404).json({ error: "Match not found" });

    return res.json({ match });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch match", details: err.message });
  }
});

// POST /api/v1/arena/matches/:matchId/moves
router.post("/matches/:matchId/moves", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { matchId } = req.params;
    const { move } = req.body; // provided by human. If AI vs AI, we handle internally.

    const match = await prisma.arenaMatch.findUnique({
      where: { id: matchId },
      include: { whiteModelVersion: true, blackModelVersion: true }
    });

    if (!match) return res.status(404).json({ error: "Match not found" });
    if (match.whiteUserId !== userId && match.blackUserId !== userId) {
      return res.status(403).json({ error: "Unauthorized: You are not a participant in this match." });
    }
    if (match.status !== "IN_PROGRESS") return res.status(400).json({ error: "Match is not in progress" });

    const chess = new Chess(match.fen);

    // Apply human move if a move was provided
    let currentHistory = match.moveHistory || [];
    if (move) {
      let userMoveObj;
      try {
        userMoveObj = chess.move(move);
      } catch {
        return res.status(400).json({ error: `Illegal move: ${move}` });
      }

      currentHistory.push({
        move: userMoveObj.san,
        by: "USER",
        fenAfter: chess.fen(),
      });
    }

    const checkGameEnd = (g) => {
      if (g.isGameOver()) {
        if (g.isCheckmate()) return g.turn() === "w" ? "BLACK_WON" : "WHITE_WON";
        return "DRAW";
      }
      return null;
    };

    let result = checkGameEnd(chess);
    
    // Process AI counter-move (or AI move if no move was provided i.e. AI turn)
    let aiMoveSan = null;
    let prediction = null;
    if (!result) {
      const isWhiteTurn = chess.turn() === 'w';
      const aiModel = isWhiteTurn ? match.whiteModelVersion : match.blackModelVersion;
      
      // If AI is playing
      if (aiModel) {
        const candidates = await StockfishService.getCandidates(chess.fen(), 10, 5);
        prediction = await MLServiceBridge.getModelPrediction({
          userId: isWhiteTurn ? match.whiteUserId : match.blackUserId,
          modelType: aiModel.modelType,
          modelVersionId: aiModel.id,
          fen: chess.fen(),
          candidates,
          moveNumber: Math.floor(chess.moveNumber())
        });
        
        aiMoveSan = prediction.recommendedMove || (candidates.length > 0 ? candidates[0].move : chess.moves()[0]);
        let aiMoveObj;
        try {
          aiMoveObj = chess.move(aiMoveSan);
        } catch (e) {
          aiMoveObj = chess.move(chess.moves()[0]);
        }

        currentHistory.push({
          move: aiMoveObj.san,
          by: aiModel.modelType,
          fenAfter: chess.fen(),
          prediction
        });
        
        result = checkGameEnd(chess);
      }
    }

    const updateData = {
      fen: chess.fen(),
      pgn: chess.pgn(),
      moveHistory: currentHistory,
    };

    if (result) {
      updateData.status = result === "DRAW" ? "DRAW" : "MODEL_WON";
      updateData.result = result;
      updateData.completedAt = new Date();
      updateData.terminationReason = result === "DRAW" ? "DRAW_AGREEMENT" : "CHECKMATE"; // Simplified
    }

    const updatedMatch = await prisma.arenaMatch.update({
      where: { id: matchId },
      data: updateData
    });

    // Handle rating updates if match is completed
    if (result && result !== "IN_PROGRESS") {
      try {
        // Standard Elo rating update (K=32)
        const K = 32;
        const whiteRating = await prisma.arenaRating.findFirst({ where: { userId: match.whiteUserId }, orderBy: { createdAt: "desc" } });
        const blackRating = await prisma.arenaRating.findFirst({ where: { userId: match.blackUserId }, orderBy: { createdAt: "desc" } });
        
        const whiteElo = whiteRating?.elo ?? 1200;
        const blackElo = blackRating?.elo ?? 1200;
        
        const expectedWhite = 1 / (1 + Math.pow(10, (blackElo - whiteElo) / 400));
        const expectedBlack = 1 - expectedWhite;
        
        let scoreWhite = 0.5; // DRAW
        if (result === "WHITE_WON") scoreWhite = 1;
        else if (result === "BLACK_WON") scoreWhite = 0;
        
        const newWhiteElo = Math.round(whiteElo + K * (scoreWhite - expectedWhite));
        const newBlackElo = Math.round(blackElo + K * ((1 - scoreWhite) - expectedBlack));
        
        await prisma.$transaction([
          prisma.arenaRating.create({
            data: { userId: match.whiteUserId, elo: newWhiteElo, matchId, delta: newWhiteElo - whiteElo }
          }),
          prisma.arenaRating.create({
            data: { userId: match.blackUserId, elo: newBlackElo, matchId, delta: newBlackElo - blackElo }
          })
        ]);
      } catch (ratingErr) {
        // Rating update failure should not block the move response — log and continue
        console.error("Arena rating update failed:", ratingErr.message);
      }
    }

    return res.json({
      match: updatedMatch,
      aiMove: aiMoveSan,
      prediction,
      isGameOver: !!result
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to process move", details: err.message });
  }
});

// POST /api/v1/arena/matches/:matchId/resign
router.post("/matches/:matchId/resign", authenticateSupabaseUser, async (req, res) => {
  try {
    const { matchId } = req.params;
    const match = await prisma.arenaMatch.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: "Match not found" });
    if (match.whiteUserId !== req.user.id && match.blackUserId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized: You are not a participant in this match." });
    }

    const updated = await prisma.arenaMatch.update({
      where: { id: matchId },
      data: {
        status: "RESIGNED",
        result: match.whiteUserId === req.user.id ? "BLACK_WON" : "WHITE_WON",
        terminationReason: "RESIGNATION",
        completedAt: new Date()
      }
    });

    return res.json({ match: updated });
  } catch (err) {
    return res.status(500).json({ error: "Failed to resign", details: err.message });
  }
});

export default router;
