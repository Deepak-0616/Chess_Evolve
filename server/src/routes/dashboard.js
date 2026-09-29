import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { sendSuccess } from "../utils/apiResponse.js";
import { authenticate } from "../middleware/auth.js";
import { ChessDNAService } from "../services/dna/service.js";
import { PeakSelfService } from "../services/peak-self/service.js";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authenticate, async (req, res) => {
  const userId = req.user.userId;

  const [user, dna, peakSelf, recentGames] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { chessProfile: true },
    }),
    ChessDNAService.getCurrentDNA(userId),
    PeakSelfService.getCurrentPeakSelf(userId),
    prisma.game.findMany({
      where: { userId },
      take: 5,
      orderBy: { playedAt: "desc" },
      select: {
        id: true,
        playedAt: true,
        playerColor: true,
        result: true,
        playerRating: true,
        opponentRating: true,
        white: true,
        black: true,
        openingName: true,
        accuracy: true,
      },
    }),
  ]);

  const winsCount = await prisma.game.count({ where: { userId, result: "1-0" } });
  const lossesCount = await prisma.game.count({ where: { userId, result: "0-1" } });
  const drawsCount = await prisma.game.count({ where: { userId, result: "1/2-1/2" } });

  const totalGames = winsCount + lossesCount + drawsCount;
  const avgAcc = recentGames.length > 0
    ? recentGames.reduce((acc, g) => acc + (g.accuracy || 75), 0) / recentGames.length
    : 82.5;

  const latestRating = recentGames[0]?.playerRating || 1400;

  return sendSuccess(res, {
    player: {
      username: user?.chessProfile?.username || user?.displayName || "Player",
      rating: latestRating,
      gamesAnalyzed: dna.gamesAnalyzed || totalGames,
    },
    performance: {
      accuracy: Number(avgAcc.toFixed(1)),
      wins: winsCount,
      losses: lossesCount,
      draws: drawsCount,
    },
    dna: {
      version: dna.version,
      topStrength: dna.strengths[0]?.name || "Tactical attacks",
      topWeakness: dna.weaknesses[0]?.name || "Defensive positions",
    },
    peakSelf: {
      version: peakSelf.version,
      available: true,
    },
    recentGames,
  });
});

export default router;
