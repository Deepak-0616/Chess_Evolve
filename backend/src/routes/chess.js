import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";
import { ChessComClient } from "../services/chesscom/client.js";
import { AccountSyncManager } from "../services/jobs/syncJob.js";

const router = Router();

// POST /api/v1/chess/profile/connect
router.post("/profile/connect", authenticateSupabaseUser, async (req, res) => {
  try {
    const { chessUsername } = req.body;
    if (!chessUsername || typeof chessUsername !== "string") {
      return res.status(400).json({ error: "Valid chessUsername is required" });
    }

    const userId = req.user.id;

    // Verify username exists on Chess.com
    let profileData;
    try {
      profileData = await ChessComClient.getProfile(chessUsername);
    } catch (apiErr) {
      return res
        .status(404)
        .json({
          error: `Chess.com user "${chessUsername}" was not found or API is unavailable`,
        });
    }

    // Connect Chess.com profile to authenticated user
    const chessProfile = await prisma.chessProfile.upsert({
      where: { userId },
      create: {
        userId,
        chessUsername, // use exactly what they typed
        playerUrl: profileData.url,
        title: profileData.title,
        avatarUrl: profileData.avatar,
        country: profileData.country,
        followers: profileData.followers,
        joinedAt: profileData.joined
          ? new Date(profileData.joined * 1000)
          : null,
        syncStatus: "IDLE",
      },
      update: {
        chessUsername, // use exactly what they typed
        playerUrl: profileData.url,
        title: profileData.title,
        avatarUrl: profileData.avatar,
        country: profileData.country,
        followers: profileData.followers,
      },
    });

    // Also initialize or update Arena Profile visibility
    await prisma.arenaProfile.upsert({
      where: { userId },
      create: {
        userId,
        visibility: "PUBLIC",
      },
      update: {},
    });

    // Trigger async full synchronization in background
    AccountSyncManager.executeFullSync(userId, chessUsername).catch((err) => {
      console.error("Background full sync error for user:", userId, err);
    });

    return res.json({
      message:
        "Chess.com profile successfully connected. Synchronization started.",
      chessProfile,
    });
  } catch (err) {
    return res
      .status(500)
      .json({
        error: "Failed to connect Chess.com profile",
        details: err.message,
      });
  }
});

// GET /api/v1/chess/profile
router.get("/profile", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const chessProfile = await prisma.chessProfile.findUnique({
      where: { userId },
    });

    if (!chessProfile) {
      return res
        .status(404)
        .json({ error: "No connected Chess.com profile found for this user" });
    }

    // Aggregate stats from games
    const games = await prisma.game.findMany({
      where: { chessProfileId: chessProfile.id },
      orderBy: { playedAt: "desc" },
    });

    let wins = 0,
      losses = 0,
      draws = 0;
    for (const g of games) {
      if (g.result === "WIN") wins++;
      else if (g.result === "LOSS") losses++;
      else draws++;
    }

    const currentRating = games.length > 0 ? games[0].userRating : null;
    const peakRating =
      games.length > 0 ? Math.max(...games.map((g) => g.userRating)) : null;
    const recentGames = games.slice(0, 5).map((g) => ({
      id: g.id,
      result:
        g.result === "WIN" ? "win" : g.result === "LOSS" ? "loss" : "draw",
      opponent: g.opponentUsername,
      color: g.userColor === "WHITE" ? "White" : "Black",
      rating: g.userRating,
      date: new Date(g.playedAt).toLocaleDateString(),
      opening: "Standard Play",
    }));

    const enrichedProfile = {
      ...chessProfile,
      totalGames: games.length,
      wins,
      losses,
      draws,
      currentRating,
      peakRating,
      recentGames,
    };

    return res.json({ data: enrichedProfile });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch chess profile", details: err.message });
  }
});

// POST /api/v1/chess/sync
router.post("/sync", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const chessProfile = await prisma.chessProfile.findUnique({
      where: { userId },
    });

    if (!chessProfile) {
      return res
        .status(400)
        .json({ error: "Please connect a Chess.com account before syncing" });
    }

    AccountSyncManager.executeFullSync(
      userId,
      chessProfile.chessUsername,
    ).catch((err) => {
      console.error("Background sync retry error for user:", userId, err);
    });

    return res.json({
      message: "Synchronization triggered successfully",
      jobId: `sync_${userId}`,
    });
  } catch (err) {
    return res
      .status(500)
      .json({
        error: "Failed to trigger synchronization",
        details: err.message,
      });
  }
});

// GET /api/v1/chess/sync/:jobId
router.get("/sync/:jobId", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const chessProfile = await prisma.chessProfile.findUnique({
      where: { userId },
      select: {
        syncStatus: true,
        lastSyncedAt: true,
        syncProgress: true,
      },
    });

    if (!chessProfile) {
      return res.status(404).json({ error: "Chess profile not found" });
    }

    return res.json({
      status: chessProfile.syncStatus,
      lastSyncedAt: chessProfile.lastSyncedAt,
      progress: chessProfile.syncProgress,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch sync status", details: err.message });
  }
});

export default router;
