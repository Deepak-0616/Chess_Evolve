import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { authenticate } from "../middleware/auth.js";
import { ChessEngineService } from "../services/chess-engine/service.js";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authenticate, async (req, res) => {
  const userId = req.user.id;

  const profile = await prisma.chessProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return sendSuccess(res, [], 200, {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  }

  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
  const skip = (page - 1) * limit;

  const { result, color, opening, timeControl } = req.query;

  const whereClause = {
    userId,
    chessProfileId: profile.id,
  };

  if (result && typeof result === "string") {
    const resLower = result.toLowerCase();
    if (resLower === "win") {
      whereClause.OR = [
        { playerColor: "WHITE", result: "1-0" },
        { playerColor: "BLACK", result: "0-1" },
        { result: "WIN" },
      ];
    } else if (resLower === "loss") {
      whereClause.OR = [
        { playerColor: "WHITE", result: "0-1" },
        { playerColor: "BLACK", result: "1-0" },
        { result: "LOSS" },
      ];
    } else if (resLower === "draw") {
      whereClause.OR = [
        { result: "1/2-1/2" },
        { result: "DRAW" },
      ];
    }
  }

  if (color && typeof color === "string") {
    whereClause.playerColor = color.toUpperCase();
  }

  if (opening && typeof opening === "string") {
    whereClause.openingName = { contains: opening };
  }

  if (timeControl && typeof timeControl === "string") {
    whereClause.timeControl = { contains: timeControl };
  }

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where: whereClause,
      take: limit,
      skip,
      orderBy: { playedAt: "desc" },
      select: {
        id: true,
        externalId: true,
        playedAt: true,
        white: true,
        black: true,
        result: true,
        playerColor: true,
        playerRating: true,
        opponentRating: true,
        timeControl: true,
        eco: true,
        openingName: true,
        accuracy: true,
      },
    }),
    prisma.game.count({ where: whereClause }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return sendSuccess(res, games, 200, {
    page,
    limit,
    total,
    totalPages,
  });
});

router.get("/:gameId", authenticate, async (req, res) => {
  const userId = req.user.id;
  const game = await prisma.game.findFirst({
    where: { id: req.params.gameId, userId },
    include: {
      moves: { orderBy: { ply: "asc" } },
      analysis: true,
    },
  });

  if (!game) {
    return sendError(res, "GAME_NOT_FOUND", "Game not found.", 404);
  }

  return sendSuccess(res, game);
});

router.post("/:gameId/analyze", authenticate, async (req, res) => {
  const userId = req.user.id;
  const game = await prisma.game.findFirst({
    where: { id: req.params.gameId, userId },
  });

  if (!game) {
    return sendError(res, "GAME_NOT_FOUND", "Game not found.", 404);
  }

  const analysisRes = await ChessEngineService.analyzeGame(game.pgn, game.playerColor);

  const updatedAnalysis = await prisma.gameAnalysis.upsert({
    where: { gameId: game.id },
    create: {
      gameId: game.id,
      status: "COMPLETED",
      depth: 16,
      playerAccuracy: analysisRes.playerAccuracy,
      opponentAccuracy: analysisRes.opponentAccuracy,
      blunders: analysisRes.blunders,
      mistakes: analysisRes.mistakes,
      inaccuracies: analysisRes.inaccuracies,
      analysisJson: JSON.stringify(analysisRes),
    },
    update: {
      status: "COMPLETED",
      depth: 16,
      playerAccuracy: analysisRes.playerAccuracy,
      opponentAccuracy: analysisRes.opponentAccuracy,
      blunders: analysisRes.blunders,
      mistakes: analysisRes.mistakes,
      inaccuracies: analysisRes.inaccuracies,
      analysisJson: JSON.stringify(analysisRes),
    },
  });

  await prisma.game.update({
    where: { id: game.id },
    data: { accuracy: analysisRes.playerAccuracy },
  });

  return sendSuccess(
    res,
    {
      analysisJobId: updatedAnalysis.id,
      status: "COMPLETED",
    },
    202
  );
});

router.get("/:gameId/analysis", authenticate, async (req, res) => {
  const userId = req.user.id;
  const game = await prisma.game.findFirst({
    where: { id: req.params.gameId, userId },
    include: { analysis: true },
  });

  if (!game || !game.analysis) {
    return sendError(res, "ANALYSIS_NOT_FOUND", "No analysis found for this game.", 404);
  }

  const details = game.analysis.analysisJson ? JSON.parse(game.analysis.analysisJson) : {};

  return sendSuccess(res, {
    status: game.analysis.status,
    accuracy: {
      player: game.analysis.playerAccuracy,
      opponent: game.analysis.opponentAccuracy,
    },
    summary: {
      blunders: game.analysis.blunders,
      mistakes: game.analysis.mistakes,
      inaccuracies: game.analysis.inaccuracies,
      excellentMoves: details.excellentMoves || 0,
    },
    criticalMoments: details.criticalMoments || [],
    moveEvaluations: details.moveEvaluations || [],
  });
});

export default router;
