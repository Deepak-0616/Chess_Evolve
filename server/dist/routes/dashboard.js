"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const auth_1 = require("../middleware/auth");
const service_1 = require("../services/dna/service");
const service_2 = require("../services/peak-self/service");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get("/", auth_1.authenticate, async (req, res) => {
    const userId = req.user.userId;
    const [user, dna, peakSelf, recentGames] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            include: { chessProfile: true },
        }),
        service_1.ChessDNAService.getCurrentDNA(userId),
        service_2.PeakSelfService.getCurrentPeakSelf(userId),
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
    return (0, apiResponse_1.sendSuccess)(res, {
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
exports.default = router;
