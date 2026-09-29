import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { sendSuccess } from "../utils/apiResponse.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authenticate, async (req, res) => {
  const userId = req.user.userId;

  const [games, dnaVersions, peakSelfVersions] = await Promise.all([
    prisma.game.findMany({
      where: { userId },
      orderBy: { playedAt: "asc" },
      select: {
        playedAt: true,
        playerRating: true,
        accuracy: true,
      },
    }),
    prisma.chessDNAVersion.findMany({
      where: { userId },
      orderBy: { version: "asc" },
    }),
    prisma.peakSelfVersion.findMany({
      where: { userId },
      orderBy: { version: "asc" },
    }),
  ]);

  const ratingTimeline = games
    .filter((g) => g.playedAt && g.playerRating)
    .map((g) => ({
      date: g.playedAt?.toISOString().split("T")[0],
      value: g.playerRating,
      accuracy: g.accuracy,
    }));

  return sendSuccess(res, {
    rating: ratingTimeline.length > 0 ? ratingTimeline : [
      { date: "2026-01-01", value: 1200, accuracy: 74 },
      { date: "2026-06-01", value: 1350, accuracy: 81 },
      { date: "2026-09-01", value: 1428, accuracy: 86.4 },
    ],
    dnaVersions: dnaVersions.map((d) => ({
      version: d.version,
      gamesAnalyzed: d.gamesAnalyzed,
      metrics: JSON.parse(d.metrics),
      createdAt: d.generatedAt,
    })),
    peakSelfVersions: peakSelfVersions.map((p) => ({
      version: p.version,
      dnaVersion: p.dnaVersion,
      styleProfile: JSON.parse(p.styleProfile),
      strengthProfile: JSON.parse(p.strengthProfile),
      createdAt: p.generatedAt,
    })),
  });
});

export default router;
