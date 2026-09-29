import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { sendSuccess } from "../utils/apiResponse.js";
import { authenticate } from "../middleware/auth.js";
import { ChessDNAService } from "../services/dna/service.js";
import { PeakSelfService } from "../services/peak-self/service.js";
import { ChessComClient } from "../services/chesscom/client.js";

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

  const username = user?.chessProfile?.username;
  const comStats = username ? await ChessComClient.getPlayerStats(username) : null;

  const rapidRating = comStats?.chess_rapid?.last?.rating;
  const blitzRating = comStats?.chess_blitz?.last?.rating;
  const bulletRating = comStats?.chess_bullet?.last?.rating;
  const dailyRating = comStats?.chess_daily?.last?.rating;

  const officialRating = rapidRating || blitzRating || bulletRating || dailyRating || recentGames[0]?.playerRating || 1400;

  const winsCount = await prisma.game.count({
    where: {
      userId,
      OR: [
        { playerColor: "WHITE", result: "1-0" },
        { playerColor: "BLACK", result: "0-1" },
        { result: "WIN" },
      ],
    },
  });

  const lossesCount = await prisma.game.count({
    where: {
      userId,
      OR: [
        { playerColor: "WHITE", result: "0-1" },
        { playerColor: "BLACK", result: "1-0" },
        { result: "LOSS" },
      ],
    },
  });

  const drawsCount = await prisma.game.count({
    where: {
      userId,
      OR: [
        { result: "1/2-1/2" },
        { result: "DRAW" },
      ],
    },
  });

  const dbTotalGames = winsCount + lossesCount + drawsCount;

  const officialWins = comStats
    ? (comStats.chess_rapid?.record?.win || 0) +
      (comStats.chess_blitz?.record?.win || 0) +
      (comStats.chess_bullet?.record?.win || 0) +
      (comStats.chess_daily?.record?.win || 0)
    : winsCount;

  const officialLosses = comStats
    ? (comStats.chess_rapid?.record?.loss || 0) +
      (comStats.chess_blitz?.record?.loss || 0) +
      (comStats.chess_bullet?.record?.loss || 0) +
      (comStats.chess_daily?.record?.loss || 0)
    : lossesCount;

  const officialDraws = comStats
    ? (comStats.chess_rapid?.record?.draw || 0) +
      (comStats.chess_blitz?.record?.draw || 0) +
      (comStats.chess_bullet?.record?.draw || 0) +
      (comStats.chess_daily?.record?.draw || 0)
    : drawsCount;

  const finalWins = Math.max(winsCount, officialWins);
  const finalLosses = Math.max(lossesCount, officialLosses);
  const finalDraws = Math.max(drawsCount, officialDraws);
  const finalTotalGames = Math.max(dbTotalGames, finalWins + finalLosses + finalDraws);

  const accAgg = await prisma.game.aggregate({
    where: { userId, accuracy: { not: null } },
    _avg: { accuracy: true },
  });
  const avgAcc = accAgg._avg.accuracy || (recentGames.length > 0
    ? recentGames.reduce((acc, g) => acc + (g.accuracy || 75), 0) / recentGames.length
    : 82.5);

  return sendSuccess(res, {
    player: {
      username: username || user?.displayName || "Player",
      rating: officialRating,
      ratingsBreakdown: {
        rapid: rapidRating || null,
        blitz: blitzRating || null,
        bullet: bulletRating || null,
      },
      gamesAnalyzed: finalTotalGames,
    },
    performance: {
      accuracy: Number(avgAcc.toFixed(1)),
      wins: finalWins,
      losses: finalLosses,
      draws: finalDraws,
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
