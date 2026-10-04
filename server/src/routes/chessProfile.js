import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { authenticate } from "../middleware/auth.js";
import { ChessComClient } from "../services/chesscom/client.js";
import { SyncJobManager } from "../services/jobs/syncJob.js";

const router = Router();
const prisma = new PrismaClient();

const connectSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid Chess.com username format"),
});

router.post("/connect", authenticate, async (req, res) => {
  const result = connectSchema.safeParse(req.body);
  if (!result.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid username", 400, result.error.format());
  }

  const { username } = result.data;
  const userId = req.user.id;

  try {
    const comProfile = await ChessComClient.getPlayerProfile(username);
    const comStats = await ChessComClient.getPlayerStats(username);
    const archives = await ChessComClient.getGameArchives(username);

    const targetUsername = comProfile.exactCaseUsername || username;

    const existingProfile = await prisma.chessProfile.findFirst({
      where: {
        OR: [
          { userId },
          { username: { equals: targetUsername } },
        ],
      },
    });

    let profile;
    if (existingProfile) {
      profile = await prisma.chessProfile.update({
        where: { id: existingProfile.id },
        data: {
          userId,
          username: targetUsername,
          profileUrl: comProfile.url,
          avatarUrl: comProfile.avatar || null,
          country: comProfile.country || null,
          title: comProfile.title || null,
          joinedAt: comProfile.joined ? new Date(comProfile.joined * 1000) : null,
        },
      });
    } else {
      profile = await prisma.chessProfile.create({
        data: {
          userId,
          username: targetUsername,
          profileUrl: comProfile.url,
          avatarUrl: comProfile.avatar || null,
          country: comProfile.country || null,
          title: comProfile.title || null,
          joinedAt: comProfile.joined ? new Date(comProfile.joined * 1000) : null,
        },
      });
    }

    // Start initial sync job
    const syncRes = await SyncJobManager.startSyncJob(userId, false);

    const rapidRating = comStats?.chess_rapid?.last?.rating || null;
    const blitzRating = comStats?.chess_blitz?.last?.rating || null;
    const bulletRating = comStats?.chess_bullet?.last?.rating || null;

    return sendSuccess(res, {
      profile: {
        id: profile.id,
        username: profile.username,
        title: profile.title,
        avatarUrl: profile.avatarUrl,
        country: profile.country,
        joinedAt: profile.joinedAt,
        ratings: {
          rapid: rapidRating,
          blitz: blitzRating,
          bullet: bulletRating,
        },
      },
      sync: {
        jobId: syncRes.jobId,
        status: "QUEUED",
        archiveCount: archives.length,
        estimatedGames: archives.length * 50,
      },
    });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return sendError(res, "CHESS_PROFILE_NOT_FOUND", "We couldn't find this Chess.com profile.", 404);
    }
    return sendError(res, "CHESS_API_ERROR", err.message || "Failed to fetch Chess.com profile.", 500);
  }
});

router.get("/", authenticate, async (req, res) => {
  const profile = await prisma.chessProfile.findUnique({
    where: { userId: req.user.id },
  });

  if (!profile) {
    return sendError(res, "CHESS_PROFILE_NOT_FOUND", "No Chess.com profile connected.", 404);
  }

  return sendSuccess(res, {
    id: profile.id,
    username: profile.username,
    avatarUrl: profile.avatarUrl,
    title: profile.title,
    country: profile.country,
    joinedAt: profile.joinedAt,
    lastSyncedAt: profile.lastSyncedAt,
    gamesImported: profile.gamesImported,
    gamesAnalyzed: profile.gamesAnalyzed,
    dnaVersion: profile.dnaVersion,
    peakSelfVersion: profile.peakSelfVersion,
    aiVisibility: profile.aiVisibility,
    aiRatingCurrentSelf: profile.aiRatingCurrentSelf,
    aiRatingPeakSelf: profile.aiRatingPeakSelf,
  });
});

export default router;
