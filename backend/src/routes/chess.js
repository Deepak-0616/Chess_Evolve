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

    // Ingest latest monthly games immediately so recent games and initial games are available right away
    await AccountSyncManager.syncLatestGames(userId, chessUsername).catch((err) => {
      console.warn("Initial recent games sync warning:", err.message);
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

    // Auto-sync latest games if lastSyncedAt is older than 15s (ensures zero delay for recently finished games)
    const lastSyncedTime = chessProfile.lastSyncedAt ? new Date(chessProfile.lastSyncedAt).getTime() : 0;
    if (Date.now() - lastSyncedTime > 15000) {
      await AccountSyncManager.syncLatestGames(userId, chessProfile.chessUsername).catch((e) => {
        console.warn("Auto-sync recent games error on profile:", e.message);
      });
    }

    // Fetch live true stats directly from Chess.com for ratings
    let liveStats = { 
      overall: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
      all: { wins: 0, losses: 0, draws: 0, totalGames: 0, currentRating: 0, peakRating: 0 },
      rapid: { currentRating: 0, peakRating: 0, wins: 0, losses: 0, draws: 0, totalGames: 0 },
      blitz: { currentRating: 0, peakRating: 0, wins: 0, losses: 0, draws: 0, totalGames: 0 },
      bullet: { currentRating: 0, peakRating: 0, wins: 0, losses: 0, draws: 0, totalGames: 0 }
    };
    
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

    // Query game counts from the database to guarantee total count and records match actual games
    const [
      dbGameCount, dbRatedCount, dbUnratedCount,
      dbWins, dbLosses, dbDraws,
      dbRapidTotal, dbRapidRated,
      dbBlitzTotal, dbBlitzRated,
      dbBulletTotal, dbBulletRated
    ] = await Promise.all([
      prisma.game.count({ where: { chessProfileId: chessProfile.id } }),
      prisma.game.count({ where: { chessProfileId: chessProfile.id, rated: true } }),
      prisma.game.count({ where: { chessProfileId: chessProfile.id, rated: false } }),
      prisma.game.count({ where: { chessProfileId: chessProfile.id, result: "WIN" } }),
      prisma.game.count({ where: { chessProfileId: chessProfile.id, result: "LOSS" } }),
      prisma.game.count({ where: { chessProfileId: chessProfile.id, result: "DRAW" } }),
      prisma.game.count({ where: { chessProfileId: chessProfile.id, timeClass: "rapid" } }),
      prisma.game.count({ where: { chessProfileId: chessProfile.id, timeClass: "rapid", rated: true } }),
      prisma.game.count({ where: { chessProfileId: chessProfile.id, timeClass: "blitz" } }),
      prisma.game.count({ where: { chessProfileId: chessProfile.id, timeClass: "blitz", rated: true } }),
      prisma.game.count({ where: { chessProfileId: chessProfile.id, timeClass: "bullet" } }),
      prisma.game.count({ where: { chessProfileId: chessProfile.id, timeClass: "bullet", rated: true } }),
    ]);

    // Save exact rated figures from Chess.com PubAPI
    const pubRatedTotal = liveStats.overall.totalGames || dbRatedCount;
    const pubRatedWins = liveStats.overall.wins;
    const pubRatedLosses = liveStats.overall.losses;
    const pubRatedDraws = liveStats.overall.draws;

    // Attach both rated and total counts to overall & all
    liveStats.overall.ratedGames = pubRatedTotal;
    liveStats.overall.ratedWins = pubRatedWins;
    liveStats.overall.ratedLosses = pubRatedLosses;
    liveStats.overall.ratedDraws = pubRatedDraws;
    liveStats.overall.totalGames = dbGameCount > 0 ? dbGameCount : pubRatedTotal;
    liveStats.overall.unratedGames = dbUnratedCount;
    liveStats.overall.totalWins = dbWins;
    liveStats.overall.totalLosses = dbLosses;
    liveStats.overall.totalDraws = dbDraws;

    // Default wins/losses/draws represent rated record matching Chess.com Stats screen
    liveStats.overall.wins = pubRatedWins;
    liveStats.overall.losses = pubRatedLosses;
    liveStats.overall.draws = pubRatedDraws;

    liveStats.all = {
      ...liveStats.overall,
      currentRating: liveStats.rapid.currentRating || liveStats.blitz.currentRating || liveStats.bullet.currentRating || 0,
      peakRating: Math.max(liveStats.rapid.peakRating || 0, liveStats.blitz.peakRating || 0, liveStats.bullet.peakRating || 0),
    };

    // Category specifics: preserve exact rated records and attach totals
    const tcCounts = {
      rapid: { total: dbRapidTotal, rated: dbRapidRated },
      blitz: { total: dbBlitzTotal, rated: dbBlitzRated },
      bullet: { total: dbBulletTotal, rated: dbBulletRated },
    };

    ['rapid', 'blitz', 'bullet'].forEach(tc => {
      const counts = tcCounts[tc];
      liveStats[tc].ratedGames = liveStats[tc].totalGames || counts.rated;
      liveStats[tc].ratedWins = liveStats[tc].wins;
      liveStats[tc].ratedLosses = liveStats[tc].losses;
      liveStats[tc].ratedDraws = liveStats[tc].draws;
      liveStats[tc].totalGames = counts.total > 0 ? counts.total : liveStats[tc].ratedGames;
      liveStats[tc].unratedGames = Math.max(0, liveStats[tc].totalGames - liveStats[tc].ratedGames);
    });

    // Query recent games directly from the database for 100% consistency with Game History page
    const recentDbGames = await prisma.game.findMany({
      where: { chessProfileId: chessProfile.id },
      orderBy: { playedAt: "desc" },
      take: 5,
      include: { gameAnalysis: true },
    });

    let liveRecentGames = recentDbGames.map((g) => {
      const isWhite = g.userColor === "WHITE";
      return {
        id: g.id,
        result: (g.result || "").toLowerCase(),
        opponent: g.opponentUsername,
        color: isWhite ? "White" : "Black",
        rating: isWhite ? g.whiteRating : g.blackRating,
        date: new Date(g.playedAt).toLocaleDateString(),
        opening: g.gameAnalysis?.openingName || "Standard Play",
        timeControl: g.timeClass ? g.timeClass.charAt(0).toUpperCase() + g.timeClass.slice(1) : g.timeControl,
      };
    });

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

    // Fast sync latest games immediately
    await AccountSyncManager.syncLatestGames(
      userId,
      chessProfile.chessUsername,
    ).catch((e) => console.warn("Manual sync quick error:", e.message));

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
      message: "Synchronization started successfully",
      status: "SYNCING",
      jobId: `sync_${userId}`,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to trigger sync", details: err.message });
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
