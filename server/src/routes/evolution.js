import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { sendSuccess } from "../utils/apiResponse.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authenticate, async (req, res) => {
  const userId = req.user.id;

  const [games, dnaVersions, peakSelfVersions, modelVersions, evolutionEvents] = await Promise.all([
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
    prisma.mLModelVersion.findMany({
      where: { userId },
      orderBy: { version: "asc" }
    }),
    prisma.evolutionEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const ratingTimeline = games
    .filter((g) => g.playedAt && g.playerRating)
    .map((g) => ({
      date: g.playedAt?.toISOString().split("T")[0],
      value: g.playerRating,
      accuracy: g.accuracy,
    }));

  return sendSuccess(res, {
    rating: ratingTimeline,
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
    modelVersions: modelVersions.map(m => ({
      id: m.id,
      modelType: m.modelType,
      version: m.version,
      status: m.status,
      metrics: m.metrics ? JSON.parse(m.metrics) : null,
      trainedAt: m.trainedAt
    })),
    events: evolutionEvents
  });
});

export default router;
