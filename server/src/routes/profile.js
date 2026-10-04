import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const prisma = new PrismaClient();

const updateProfileSchema = z.object({
  displayName: z.string().min(2).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  aiVisibility: z.enum(["PRIVATE", "DISCOVERABLE", "PUBLIC"]).optional(),
});

router.get("/", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { chessProfile: true }
    });

    if (!user) {
      return sendError(res, "USER_NOT_FOUND", "User not found.", 404);
    }

    return sendSuccess(res, {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      chessProfile: user.chessProfile ? {
        id: user.chessProfile.id,
        username: user.chessProfile.username,
        avatarUrl: user.chessProfile.avatarUrl,
        country: user.chessProfile.country,
        title: user.chessProfile.title,
        lastSyncedAt: user.chessProfile.lastSyncedAt,
        gamesImported: user.chessProfile.gamesImported,
        gamesAnalyzed: user.chessProfile.gamesAnalyzed,
        aiVisibility: user.chessProfile.aiVisibility,
        aiRatingCurrentSelf: user.chessProfile.aiRatingCurrentSelf,
        aiRatingPeakSelf: user.chessProfile.aiRatingPeakSelf,
      } : null
    });
  } catch (err) {
    return sendError(res, "PROFILE_FETCH_FAILED", err.message, 500);
  }
});

router.patch("/", authenticate, async (req, res) => {
  const result = updateProfileSchema.safeParse(req.body);
  if (!result.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid update payload", 400, result.error.format());
  }

  const { displayName, avatarUrl, aiVisibility } = result.data;
  try {
    const userUpdates = {};
    if (displayName !== undefined) userUpdates.displayName = displayName;
    if (avatarUrl !== undefined) userUpdates.avatarUrl = avatarUrl;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: userUpdates,
      include: { chessProfile: true }
    });

    if (aiVisibility && updatedUser.chessProfile) {
      await prisma.chessProfile.update({
        where: { id: updatedUser.chessProfile.id },
        data: { aiVisibility }
      });
    }

    const finalUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { chessProfile: true }
    });

    return sendSuccess(res, {
      id: finalUser.id,
      email: finalUser.email,
      displayName: finalUser.displayName,
      avatarUrl: finalUser.avatarUrl,
      chessProfile: finalUser.chessProfile
    });
  } catch (err) {
    return sendError(res, "PROFILE_UPDATE_FAILED", err.message, 500);
  }
});

export default router;
