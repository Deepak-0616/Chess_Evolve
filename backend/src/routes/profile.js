import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";
import { ChessComClient } from "../services/chesscom/client.js";
import { AccountSyncManager } from "../services/jobs/syncJob.js";

const router = Router();

// In-memory profile cache for ultra-fast profile retrieval (<5ms)
const profileCache = new Map();
export const invalidateProfileCache = (userId) => {
  if (userId) profileCache.delete(userId);
  else profileCache.clear();
};

// GET /api/v1/profile
router.get("/", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const cached = profileCache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
      return res.json(cached.payload);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chessProfile: true,
        arenaProfile: true,
        currentDna: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    let totalGames = 0;
    let ratedGames = 0;
    let winRate = 0;
    let peakRating = "—";

    if (user.chessProfile?.chessUsername) {
      try {
        const statsData = await ChessComClient.getStats(user.chessProfile.chessUsername);
        if (statsData) {
          let wins = 0;
          let total = 0;
          let maxRating = 0;
          for (const [key, cat] of Object.entries(statsData)) {
            if (key.startsWith("chess_") && cat.record) {
              wins += cat.record.win || 0;
              total +=
                (cat.record.win || 0) +
                (cat.record.loss || 0) +
                (cat.record.draw || 0);
            }
            if (cat.best?.rating && cat.best.rating > maxRating) {
              maxRating = cat.best.rating;
            }
          }
          ratedGames = total;
          totalGames = total;
          winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
          peakRating = maxRating ? maxRating.toLocaleString() : "—";
        }
      } catch (statsErr) {
        console.warn("Failed to fetch live stats for profile:", statsErr.message);
      }
    }

    // Check local database counts to ensure all archive games (including unrated/casual) are counted
    let casualGames = 0;
    if (user.chessProfile?.id) {
      const [dbRated, dbUnrated] = await Promise.all([
        prisma.game.count({ where: { chessProfileId: user.chessProfile.id, rated: true } }),
        prisma.game.count({ where: { chessProfileId: user.chessProfile.id, rated: false } }),
      ]);
      ratedGames = Math.max(ratedGames, dbRated);
      casualGames = dbUnrated;
      totalGames = ratedGames + casualGames;
    }

    const enrichedUser = {
      ...user,
      chessUsername: user.chessProfile?.chessUsername || null,
      ratedGames: ratedGames.toLocaleString(),
      unratedGames: casualGames.toLocaleString(),
      totalGames: totalGames.toLocaleString(),
      winRate: winRate,
      peakRating: peakRating,
    };

    const payload = { profile: enrichedUser, data: enrichedUser };
    profileCache.set(userId, { payload, expiresAt: Date.now() + 25000 });

    return res.json(payload);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch user profile", details: err.message });
  }
});

// PATCH /api/v1/profile
router.patch("/", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    profileCache.delete(userId);
    const { displayName, avatarUrl, arenaVisibility, chessUsername } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: displayName || undefined,
        avatarUrl: avatarUrl || undefined,
      },
    });

    if (arenaVisibility) {
      await prisma.arenaProfile.upsert({
        where: { userId },
        create: {
          userId,
          visibility: arenaVisibility,
        },
        update: {
          visibility: arenaVisibility,
        },
      });
    }

    let chessProfile = null;
    if (chessUsername && typeof chessUsername === "string" && chessUsername.trim()) {
      const cleanUsername = chessUsername.trim();
      const existing = await prisma.chessProfile.findUnique({ where: { userId } });

      if (!existing || existing.chessUsername.toLowerCase() !== cleanUsername.toLowerCase()) {
        let profileData;
        try {
          profileData = await ChessComClient.getProfile(cleanUsername);
        } catch (apiErr) {
          return res.status(404).json({
            error: `Chess.com user "${cleanUsername}" was not found or API is unavailable`,
          });
        }

        const canonicalUsername = profileData.username || cleanUsername;

        chessProfile = await prisma.chessProfile.upsert({
          where: { userId },
          create: {
            userId,
            chessUsername: canonicalUsername,
            playerUrl: profileData.url,
            title: profileData.title,
            avatarUrl: profileData.avatar,
            country: profileData.country,
            followers: profileData.followers,
            joinedAt: profileData.joined ? new Date(profileData.joined * 1000) : null,
            syncStatus: "IDLE",
          },
          update: {
            chessUsername: canonicalUsername,
            playerUrl: profileData.url,
            title: profileData.title,
            avatarUrl: profileData.avatar,
            country: profileData.country,
            followers: profileData.followers,
          },
        });

        // Fast recent games sync in background
        AccountSyncManager.syncLatestGames(userId, canonicalUsername).catch((err) => {
          console.warn("Initial recent games sync warning:", err.message);
        });

        // Queue full sync
        try {
          const { syncQueue, safeEnqueue } = await import("../queues/index.js");
          await safeEnqueue(
            syncQueue,
            "sync",
            { userId, chessUsername: canonicalUsername },
            { jobId: `sync_${userId}` },
            () => {
              AccountSyncManager.executeFullSync(userId, canonicalUsername).catch((err) => {
                console.error("Background full sync fallback error for user:", userId, err);
              });
            }
          );
        } catch (queueErr) {
          AccountSyncManager.executeFullSync(userId, canonicalUsername).catch((err) => {
            console.error("Background full sync fallback error for user:", userId, err);
          });
        }
      } else {
        chessProfile = existing;
      }
    }

    return res.json({ message: "Profile updated successfully", user, chessProfile });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to update profile", details: err.message });
  }
});

export default router;
