import { prisma } from "../../utils/prisma.js";

export class CoachContextBuilder {
  /**
   * Build general structured context for the player.
   */
  static async buildGeneralContext(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chessProfile: true,
        currentDna: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.chessProfile && user.email) {
      const existingProfile = await prisma.chessProfile.findFirst({
        where: { user: { email: user.email } },
        orderBy: { updatedAt: "desc" },
      });
      if (existingProfile) {
        user.chessProfile = existingProfile;
      }
    }

    if (user.chessProfile) {
      const directGames = await prisma.game.count({ where: { chessProfileId: user.chessProfile.id } });
      if (directGames === 0 && (user.email || user.chessProfile.chessUsername)) {
        const profileWithGames = await prisma.chessProfile.findFirst({
          where: {
            OR: [
              ...(user.email ? [{ user: { email: user.email } }] : []),
              ...(user.chessProfile.chessUsername ? [{ chessUsername: { equals: user.chessProfile.chessUsername, mode: "insensitive" } }] : []),
            ],
            games: { some: {} },
          },
          orderBy: { updatedAt: "desc" },
        });
        if (profileWithGames) {
          user.chessProfile = profileWithGames;
        }
      }
    }

    // Get number of analyzed games
    const gamesAnalyzed = await prisma.game.count({
      where: {
        chessProfileId: user.chessProfile?.id,
        analyzed: true,
      },
    });

    // Get active models
    const currentSelfModel = await prisma.mLModelVersion.findFirst({
      where: { userId, modelType: "CURRENT_SELF", status: "READY" },
      orderBy: { version: "desc" },
    });

    const peakSelfModel = await prisma.mLModelVersion.findFirst({
      where: { userId, modelType: "PEAK_SELF", status: "READY" },
      orderBy: { version: "desc" },
    });

    // Recent games summary
    const recentGames = await prisma.game.findMany({
      where: {
        chessProfileId: user.chessProfile?.id,
        analyzed: true,
      },
      orderBy: { playedAt: "desc" },
      take: 5,
      include: {
        gameAnalysis: true,
      },
    });

    const recentGamesSummary = recentGames.map((g) => ({
      gameId: g.id,
      playedAt: g.playedAt,
      timeClass: g.timeClass,
      result: g.result,
      accuracy: g.gameAnalysis?.accuracy,
      inaccuracies: g.gameAnalysis?.inaccuracies,
      mistakes: g.gameAnalysis?.mistakes,
      blunders: g.gameAnalysis?.blunders,
    }));

    // Weaknesses from DNA
    const dna = user.currentDna;
    let topStrengths = [];
    let topWeaknesses = [];
    
    if (dna) {
      topStrengths = Array.isArray(dna.topStrengths) ? dna.topStrengths : [];
      topWeaknesses = Array.isArray(dna.topWeaknesses) ? dna.topWeaknesses : [];
    }

    return {
      player: {
        chessUsername: user.chessProfile?.chessUsername || "Unknown",
        gamesAnalyzed,
        rating: user.chessProfile?.syncProgress?.rating || null, // Best effort
      },
      chessDNA: dna ? {
        aggression: dna.aggression,
        tacticalPreference: dna.tacticalPreference,
        defensiveAbility: dna.defensiveAbility,
        kingSafety: dna.kingSafety,
        timePressureBehavior: dna.timePressureBehavior,
      } : null,
      strengths: topStrengths,
      weaknesses: topWeaknesses,
      recentGames: recentGamesSummary,
      currentSelf: currentSelfModel ? {
        version: currentSelfModel.version,
        gamesUsed: currentSelfModel.gamesUsed,
        metrics: currentSelfModel.behavioralMetrics || null,
      } : null,
      peakSelf: peakSelfModel ? {
        version: peakSelfModel.version,
        gamesUsed: peakSelfModel.gamesUsed,
        metrics: peakSelfModel.behavioralMetrics || null,
      } : null,
    };
  }

  /**
   * Build specific context for reviewing a single game.
   */
  static async buildGameReviewContext(userId, gameId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { chessProfile: true },
    });

    if (!user || !user.chessProfile) {
      throw new Error("User or Chess Profile not found");
    }

    const game = await prisma.game.findFirst({
      where: {
        id: gameId,
        chessProfileId: user.chessProfile.id,
      },
      include: {
        gameAnalysis: true,
      },
    });

    if (!game) {
      throw new Error("Game not found or you don't own this game.");
    }

    // Get position analysis (critical moments)
    // Here we define critical as cpLoss > 150 or Blunder/Mistake classification
    const criticalPositions = await prisma.positionAnalysis.findMany({
      where: {
        gameId: game.id,
        playerMove: true,
        OR: [
          { classification: "BLUNDER" },
          { classification: "MISTAKE" },
          { cpLoss: { gt: 1.5 } }
        ]
      },
      orderBy: { moveNumber: "asc" },
    });

    const mappedPositions = criticalPositions.map((p) => {
      let candidates = [];
      if (typeof p.candidateMoves === 'string') {
        try { candidates = JSON.parse(p.candidateMoves); } catch (e) {}
      } else if (Array.isArray(p.candidateMoves)) {
        candidates = p.candidateMoves;
      }
      
      return {
        moveNumber: p.moveNumber,
        ply: p.ply,
        playerMove: p.move,
        classification: p.classification,
        evalBefore: p.evalBefore,
        evalAfter: p.evalAfter,
        cpLoss: p.cpLoss,
        bestMove: p.bestMove,
        candidates,
        gamePhase: p.gamePhase,
      };
    });

    return {
      gameInfo: {
        id: game.id,
        timeControl: game.timeControl,
        timeClass: game.timeClass,
        userColor: game.userColor,
        opponentRating: game.opponentRating,
        result: game.result,
        endReason: game.endReason,
      },
      gameAnalysis: game.gameAnalysis ? {
        accuracy: game.gameAnalysis.accuracy,
        inaccuracies: game.gameAnalysis.inaccuracies,
        mistakes: game.gameAnalysis.mistakes,
        blunders: game.gameAnalysis.blunders,
      } : null,
      criticalMoments: mappedPositions,
    };
  }
}
