import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";
import { ChessComClient } from "../services/chesscom/client.js";
import { AccountSyncManager } from "../services/jobs/syncJob.js";
import { invalidateProfileCache } from "./profile.js";
import { invalidateEvolutionCache } from "./evolution.js";
import { invalidateTrainingCache } from "./training.js";

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

    const canonicalUsername = profileData.username || chessUsername.trim();

    // Connect Chess.com profile to authenticated user
    const chessProfile = await prisma.chessProfile.upsert({
      where: { userId },
      create: {
        userId,
        chessUsername: canonicalUsername,
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
        chessUsername: canonicalUsername,
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

    // Invalidate cached profile and stats for instant fresh data
    enrichedProfileCache.delete(userId);
    ChessComClient.invalidateCache(canonicalUsername);

    // Ingest latest monthly games immediately so profile connect returns with games already saved
    try {
      await AccountSyncManager.syncLatestGames(userId, canonicalUsername);
    } catch (err) {
      console.warn("Initial recent games sync warning:", err.message);
    }

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

    enrichedProfileCache.delete(userId);
    invalidateProfileCache(userId);
    invalidateEvolutionCache(userId);
    invalidateTrainingCache(userId);

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

// In-memory profile cache for ultra-fast dashboard responses (<5ms)
const enrichedProfileCache = new Map();

// GET /api/v1/chess/profile
router.get("/profile", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fast-path: return cached enriched profile if fresh (< 20s old)
    const cached = enrichedProfileCache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
      return res.json({ data: cached.data, chessProfile: cached.data });
    }

    const chessProfile = await prisma.chessProfile.findUnique({
      where: { userId },
    });

    if (!chessProfile) {
      return res
        .status(404)
        .json({ error: "No connected Chess.com profile found for this user" });
    }

    // Auto-sync latest games in background if lastSyncedAt is older than 15s (non-blocking for instant UI response)
    const lastSyncedTime = chessProfile.lastSyncedAt ? new Date(chessProfile.lastSyncedAt).getTime() : 0;
    if (Date.now() - lastSyncedTime > 15000) {
      AccountSyncManager.syncLatestGames(userId, chessProfile.chessUsername).catch((e) => {
        console.warn("Auto-sync recent games error on profile:", e.message);
      });
    }

    // Fetch live true stats directly from Chess.com using cached client (cached for 2m)
    let liveStats = { 
      overall: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
      all: { wins: 0, losses: 0, draws: 0, totalGames: 0, currentRating: 0, peakRating: 0 },
      rapid: { currentRating: 0, peakRating: 0, wins: 0, losses: 0, draws: 0, totalGames: 0 },
      blitz: { currentRating: 0, peakRating: 0, wins: 0, losses: 0, draws: 0, totalGames: 0 },
      bullet: { currentRating: 0, peakRating: 0, wins: 0, losses: 0, draws: 0, totalGames: 0 }
    };
    
    try {
      const statsData = await ChessComClient.getStats(chessProfile.chessUsername);
      if (statsData) {
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

    // High-performance single database aggregation query (replaces 12 separate queries)
    const [gameGroups, recentDbGames] = await Promise.all([
      prisma.game.groupBy({
        by: ["timeClass", "rated", "result"],
        where: { chessProfileId: chessProfile.id },
        _count: { _all: true },
      }),
      prisma.game.findMany({
        where: { chessProfileId: chessProfile.id },
        orderBy: { playedAt: "desc" },
        take: 7,
        select: {
          id: true,
          result: true,
          opponentUsername: true,
          userColor: true,
          whiteRating: true,
          blackRating: true,
          playedAt: true,
          timeClass: true,
          timeControl: true,
          gameAnalysis: {
            select: {
              openingName: true,
            },
          },
        },
      }),
    ]);

    let dbGameCount = 0;
    let dbRatedCount = 0;
    let dbUnratedCount = 0;
    let dbWins = 0;
    let dbLosses = 0;
    let dbDraws = 0;
    let dbRapidTotal = 0;
    let dbRapidRated = 0;
    let dbBlitzTotal = 0;
    let dbBlitzRated = 0;
    let dbBulletTotal = 0;
    let dbBulletRated = 0;

    for (const g of gameGroups) {
      const count = g._count._all;
      dbGameCount += count;
      if (g.rated) {
        dbRatedCount += count;
      } else {
        dbUnratedCount += count;
      }
      if (g.result === "WIN") dbWins += count;
      else if (g.result === "LOSS") dbLosses += count;
      else if (g.result === "DRAW") dbDraws += count;

      const tc = (g.timeClass || "").toLowerCase();
      if (tc === "rapid") {
        dbRapidTotal += count;
        if (g.rated) dbRapidRated += count;
      } else if (tc === "blitz") {
        dbBlitzTotal += count;
        if (g.rated) dbBlitzRated += count;
      } else if (tc === "bullet") {
        dbBulletTotal += count;
        if (g.rated) dbBulletRated += count;
      }
    }

    // Exact rated figures from Chess.com PubAPI
    const pubRatedWins = liveStats.overall.wins || 0;
    const pubRatedLosses = liveStats.overall.losses || 0;
    const pubRatedDraws = liveStats.overall.draws || 0;
    const pubRatedTotal = (liveStats.overall.totalGames > 0)
      ? liveStats.overall.totalGames
      : (pubRatedWins + pubRatedLosses + pubRatedDraws);

    // True rated matches: prefer whichever is higher between official PubAPI record and database rated count
    const ratedGames = Math.max(pubRatedTotal, dbRatedCount);
    // Casual / unrated matches from database
    const casualGames = dbUnratedCount;
    // Total matches: strictly rated + casual
    const totalGames = ratedGames + casualGames;

    // Attach exact counts to overall & all
    liveStats.overall = {
      ...liveStats.overall,
      ratedGames,
      unratedGames: casualGames,
      totalGames,
      ratedWins: pubRatedWins,
      ratedLosses: pubRatedLosses,
      ratedDraws: pubRatedDraws,
      wins: pubRatedWins > 0 ? pubRatedWins : dbWins,
      losses: pubRatedLosses > 0 ? pubRatedLosses : dbLosses,
      draws: pubRatedDraws > 0 ? pubRatedDraws : dbDraws,
      totalWins: dbWins,
      totalLosses: dbLosses,
      totalDraws: dbDraws,
    };

    liveStats.all = {
      ...liveStats.overall,
      currentRating: liveStats.rapid.currentRating || liveStats.blitz.currentRating || liveStats.bullet.currentRating || 0,
      peakRating: Math.max(liveStats.rapid.peakRating || 0, liveStats.blitz.peakRating || 0, liveStats.bullet.peakRating || 0),
    };

    // Category specifics: preserve exact rated records and attach totals
    const tcDbMap = {
      rapid: { total: dbRapidTotal, rated: dbRapidRated },
      blitz: { total: dbBlitzTotal, rated: dbBlitzRated },
      bullet: { total: dbBulletTotal, rated: dbBulletRated },
    };

    ['rapid', 'blitz', 'bullet'].forEach(tc => {
      const dbInfo = tcDbMap[tc];
      const officialRated = liveStats[tc].totalGames || 0;
      const tcRated = Math.max(officialRated, dbInfo.rated);
      const tcCasual = Math.max(0, dbInfo.total - dbInfo.rated);
      const tcTotal = tcRated + tcCasual;

      liveStats[tc].ratedGames = tcRated;
      liveStats[tc].unratedGames = tcCasual;
      liveStats[tc].totalGames = tcTotal;
      liveStats[tc].ratedWins = liveStats[tc].wins;
      liveStats[tc].ratedLosses = liveStats[tc].losses;
      liveStats[tc].ratedDraws = liveStats[tc].draws;
    });

    const liveRecentGames = recentDbGames.map((g) => {
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

    // Cache enriched profile in memory for 20 seconds
    enrichedProfileCache.set(userId, {
      data: enrichedProfile,
      expiresAt: Date.now() + 20000,
    });

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

    // Invalidate cached profile and stats so fresh synced data is reflected immediately
    enrichedProfileCache.delete(userId);
    invalidateProfileCache(userId);
    invalidateEvolutionCache(userId);
    invalidateTrainingCache(userId);
    ChessComClient.invalidateCache(chessProfile.chessUsername);

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
