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

    // Trigger async full synchronization via durable BullMQ syncQueue (or immediate fallback)
    try {
      const { syncQueue, safeEnqueue } = await import("../queues/index.js");
      await safeEnqueue(
        syncQueue,
        "sync",
        { userId, chessUsername },
        { jobId: `sync_${userId}` },
        () => {
          AccountSyncManager.executeFullSync(userId, chessUsername).catch((err) => {
            console.error("Background full sync fallback error for user:", userId, err);
          });
        }
      );
    } catch (queueErr) {
      AccountSyncManager.executeFullSync(userId, chessUsername).catch((err) => {
        console.error("Background full sync fallback error for user:", userId, err);
      });
    }

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

    // We skip local DB lookup entirely to ensure instant sync accuracy
    
    // Fetch live true stats directly from Chess.com to guarantee instant accuracy
    let liveStats = { 
      overall: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
      all: { wins: 0, losses: 0, draws: 0, totalGames: 0, currentRating: 0, peakRating: 0 },
      rapid: { currentRating: 0, peakRating: 0, wins: 0, losses: 0, draws: 0, totalGames: 0 },
      blitz: { currentRating: 0, peakRating: 0, wins: 0, losses: 0, draws: 0, totalGames: 0 },
      bullet: { currentRating: 0, peakRating: 0, wins: 0, losses: 0, draws: 0, totalGames: 0 }
    };
    
    let liveRecentGames = [];
    try {
      const statsRes = await fetch(`https://api.chess.com/pub/player/${chessProfile.chessUsername}/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        
        // Calculate overall totals from ALL chess_* categories (including daily, variants)
        for (const [key, category] of Object.entries(statsData)) {
          if (key.startsWith('chess_') && category.record) {
            liveStats.overall.wins += category.record.win || 0;
            liveStats.overall.losses += category.record.loss || 0;
            liveStats.overall.draws += category.record.draw || 0;
            liveStats.overall.totalGames += (category.record.win || 0) + (category.record.loss || 0) + (category.record.draw || 0);
          }
        }

        ['rapid', 'blitz', 'bullet'].forEach(tc => {
          const category = statsData[`chess_${tc}`];
          if (category) {
            liveStats[tc].currentRating = category.last?.rating || 0;
            liveStats[tc].peakRating = category.best?.rating || 0;
            liveStats[tc].wins = category.record?.win || 0;
            liveStats[tc].losses = category.record?.loss || 0;
            liveStats[tc].draws = category.record?.draw || 0;
            liveStats[tc].totalGames = liveStats[tc].wins + liveStats[tc].losses + liveStats[tc].draws;
          }
        });

        // Consolidate 'all' view
        liveStats.all = {
          wins: liveStats.overall.wins,
          losses: liveStats.overall.losses,
          draws: liveStats.overall.draws,
          totalGames: liveStats.overall.totalGames,
          currentRating: liveStats.rapid.currentRating || liveStats.blitz.currentRating || liveStats.bullet.currentRating || 0,
          peakRating: Math.max(liveStats.rapid.peakRating || 0, liveStats.blitz.peakRating || 0, liveStats.bullet.peakRating || 0),
        };
      }
    } catch (e) {
      console.error("Failed to fetch live stats from Chess.com:", e);
    }

    try {
      const archRes = await fetch(`https://api.chess.com/pub/player/${chessProfile.chessUsername}/games/archives`);
      if (archRes.ok) {
        const archData = await archRes.json();
        if (archData.archives && archData.archives.length > 0) {
          const lastArchUrl = archData.archives[archData.archives.length - 1];
          const gamesRes = await fetch(lastArchUrl);
          if (gamesRes.ok) {
            const gamesData = await gamesRes.json();
            const lastFive = (gamesData.games || []).slice(-5).reverse();
            
            liveRecentGames = lastFive.map(g => {
              const lowerTarget = chessProfile.chessUsername.toLowerCase();
              const isWhite = g.white.username.toLowerCase() === lowerTarget;
              const userResultStr = isWhite ? g.white.result : g.black.result;
              let result = "draw";
              if (userResultStr === "win") result = "win";
              else if (["checkmated", "timeout", "resigned", "abandoned", "lose"].includes(userResultStr)) result = "loss";

              return {
                id: g.url,
                result,
                opponent: isWhite ? g.black.username : g.white.username,
                color: isWhite ? "White" : "Black",
                rating: isWhite ? g.white.rating : g.black.rating,
                date: new Date(g.end_time * 1000).toLocaleDateString(),
                opening: "Standard Play"
              };
            });
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch recent games:", e);
    }

    const enrichedProfile = {
      ...chessProfile,
      stats: liveStats,
      recentGames: liveRecentGames,
    };

    return res.json({ data: enrichedProfile, chessProfile: enrichedProfile });
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

    try {
      const { syncQueue, safeEnqueue } = await import("../queues/index.js");
      await safeEnqueue(
        syncQueue,
        "sync",
        { userId, chessUsername: chessProfile.chessUsername },
        { jobId: `sync_${userId}_${Date.now()}` },
        () => {
          AccountSyncManager.executeFullSync(
            userId,
            chessProfile.chessUsername,
          ).catch((err) => {
            console.error("Background sync fallback error for user:", userId, err);
          });
        }
      );
    } catch (queueErr) {
      AccountSyncManager.executeFullSync(
        userId,
        chessProfile.chessUsername,
      ).catch((err) => {
        console.error("Background sync fallback error for user:", userId, err);
      });
    }

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
