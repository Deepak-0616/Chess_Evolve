import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

// GET /api/v1/profile
router.get("/", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
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
        const statsRes = await fetch(
          `https://api.chess.com/pub/player/${user.chessProfile.chessUsername}/stats`,
        );
        if (statsRes.ok) {
          const statsData = await statsRes.json();
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
    if (user.chessProfile?.id) {
      const [dbGamesCount, winsCount] = await Promise.all([
        prisma.game.count({ where: { chessProfileId: user.chessProfile.id } }),
        prisma.game.count({ where: { chessProfileId: user.chessProfile.id, result: "WIN" } }),
      ]);
      if (dbGamesCount > 0) {
        totalGames = Math.max(dbGamesCount, totalGames);
      }
    }

    const enrichedUser = {
      ...user,
      chessUsername: user.chessProfile?.chessUsername || null,
      ratedGames: (ratedGames || totalGames) ? (ratedGames || totalGames).toLocaleString() : "0",
      totalGames: totalGames ? totalGames.toLocaleString() : "0",
      winRate: winRate,
      peakRating: peakRating,
    };

    return res.json({ profile: enrichedUser, data: enrichedUser });
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
    const { displayName, avatarUrl, arenaVisibility } = req.body;

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

    return res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to update profile", details: err.message });
  }
});

export default router;
