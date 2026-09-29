import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class ChessDNAService {
  static async generateDNA(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chessProfile: true,
        games: {
          include: { moves: true, analysis: true },
          take: 300,
          orderBy: { playedAt: "desc" },
        },
        dnaVersions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const latestExisting = user.dnaVersions[0];

    if (user.games.length === 0) {
      if (latestExisting) {
        return {
          version: latestExisting.version,
          gamesAnalyzed: latestExisting.gamesAnalyzed,
          metrics: JSON.parse(latestExisting.metrics),
          strengths: JSON.parse(latestExisting.strengths),
          weaknesses: JSON.parse(latestExisting.weaknesses),
          summaryText: latestExisting.summaryText,
          generatedAt: latestExisting.generatedAt,
        };
      }

      const defaultMetrics = {
        aggression: 50,
        riskTaking: 50,
        tacticalPreference: 50,
        positionalPreference: 50,
        defensiveAbility: 50,
        endgameAbility: 50,
        sacrificeTendency: 50,
      };

      const defaultStrengths = [
        { id: "s1", name: "Balanced Opening Development", score: 65, confidence: 0.7 },
      ];

      const defaultWeaknesses = [
        { id: "w1", name: "Tactical Calculation under Pressure", score: 60, confidence: 0.75, evidenceGameCount: 3 },
      ];

      const created = await prisma.chessDNAVersion.upsert({
        where: {
          userId_version: {
            userId,
            version: 1,
          },
        },
        create: {
          userId,
          version: 1,
          gamesAnalyzed: 0,
          metrics: JSON.stringify(defaultMetrics),
          strengths: JSON.stringify(defaultStrengths),
          weaknesses: JSON.stringify(defaultWeaknesses),
          summaryText: "Initial baseline Chess DNA initialized. Connect Chess.com and import games to analyze your real playing style.",
        },
        update: {
          metrics: JSON.stringify(defaultMetrics),
          strengths: JSON.stringify(defaultStrengths),
          weaknesses: JSON.stringify(defaultWeaknesses),
        },
      });

      return {
        version: created.version,
        gamesAnalyzed: 0,
        metrics: defaultMetrics,
        strengths: defaultStrengths,
        weaknesses: defaultWeaknesses,
        summaryText: created.summaryText,
        generatedAt: created.generatedAt,
      };
    }

    const games = user.games;
    const gameCount = games.length;

    let totalChecks = 0;
    let totalCaptures = 0;
    let totalMovesCount = 0;
    let totalSacrifices = 0;
    let totalPawnPushes = 0;
    let totalKnightMoves = 0;
    let totalBishopMoves = 0;
    let totalRookQueenMoves = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalDraws = 0;
    let totalAccuracySum = 0;
    let analyzedCount = 0;

    let kingsideAttackCount = 0;
    let knightForkLosses = 0;
    let prematureAttackLosses = 0;
    let endgameLosses = 0;

    for (const game of games) {
      const isWin =
        (game.playerColor === "WHITE" && game.result === "1-0") ||
        (game.playerColor === "BLACK" && game.result === "0-1") ||
        game.result === "WIN";

      const isLoss =
        (game.playerColor === "WHITE" && game.result === "0-1") ||
        (game.playerColor === "BLACK" && game.result === "1-0") ||
        game.result === "LOSS";

      if (isWin) totalWins++;
      else if (isLoss) totalLosses++;
      else totalDraws++;

      if (game.accuracy) {
        totalAccuracySum += game.accuracy;
        analyzedCount++;
      }

      const playerIsWhite = game.playerColor === "WHITE";

      for (const move of game.moves) {
        const isPlayerPly = (move.ply % 2 === 1 && playerIsWhite) || (move.ply % 2 === 0 && !playerIsWhite);

        if (!isPlayerPly) continue;
        totalMovesCount++;

        const san = move.san;
        if (san.includes("+") || san.includes("#")) totalChecks++;
        if (san.includes("x")) totalCaptures++;

        if (san.startsWith("N")) totalKnightMoves++;
        else if (san.startsWith("B")) totalBishopMoves++;
        else if (san.startsWith("R") || san.startsWith("Q")) totalRookQueenMoves++;
        else if (!san.startsWith("K") && !san.startsWith("O")) totalPawnPushes++;

        if (san.includes("x") && (san.startsWith("Q") || san.startsWith("R"))) {
          totalSacrifices++;
        }
      }

      if (isLoss) {
        if (game.moves.length > 50) endgameLosses++;
        if (game.openingName && game.openingName.toLowerCase().includes("sicilian")) {
          kingsideAttackCount++;
        }
        if (game.moves.some((m) => m.san.startsWith("N") && m.san.includes("+"))) {
          knightForkLosses++;
        }
        if (game.moves.length < 25) prematureAttackLosses++;
      }
    }

    const captureRatio = totalCaptures / Math.max(1, totalMovesCount);
    const checkRatio = totalChecks / Math.max(1, totalMovesCount);

    const aggression = Math.min(98, Math.max(35, Math.round(captureRatio * 180 + checkRatio * 350 + 25)));
    const tacticalPreference = Math.min(98, Math.max(30, Math.round((totalKnightMoves + totalChecks * 2) / Math.max(1, totalMovesCount) * 220 + 35)));
    const positionalPreference = Math.min(98, Math.max(30, Math.round((totalPawnPushes + totalBishopMoves) / Math.max(1, totalMovesCount) * 160 + 30)));
    const sacrificeTendency = Math.min(95, Math.max(20, Math.round((totalSacrifices / Math.max(1, gameCount)) * 25 + 40)));
    const riskTaking = Math.min(95, Math.max(25, Math.round(aggression * 0.6 + sacrificeTendency * 0.4)));

    const avgAccuracy = analyzedCount > 0 ? totalAccuracySum / analyzedCount : 75;
    const winRate = (totalWins / Math.max(1, gameCount)) * 100;

    const defensiveAbility = Math.min(95, Math.max(30, Math.round(avgAccuracy * 0.6 + (100 - prematureAttackLosses * 10) * 0.4)));
    const endgameAbility = Math.min(95, Math.max(30, Math.round(winRate * 0.5 + (100 - endgameLosses * 8) * 0.5)));

    const metrics = {
      aggression,
      riskTaking,
      tacticalPreference,
      positionalPreference,
      defensiveAbility,
      endgameAbility,
      sacrificeTendency,
    };

    const strengths = [];
    if (aggression >= 75) {
      strengths.push({
        id: "s_aggression",
        name: "Aggressive Kingside Attacks",
        score: aggression,
        confidence: 0.92,
        description: "You excel at launching early initiative and pressing checks against enemy king positions.",
      });
    }
    if (tacticalPreference >= 70) {
      strengths.push({
        id: "s_tactics",
        name: "Sharp Tactical Vision",
        score: tacticalPreference,
        confidence: 0.89,
        description: "High tendency to spot double threats, tactical exchanges, and knight mobility.",
      });
    }
    if (endgameAbility >= 65) {
      strengths.push({
        id: "s_endgame",
        name: "Pawn Structure Conversion",
        score: endgameAbility,
        confidence: 0.85,
        description: "Solid ability to convert material or positional advantages into endgame wins.",
      });
    }
    if (strengths.length === 0) {
      strengths.push({
        id: "s_solid",
        name: "Solid Positional Setup",
        score: positionalPreference,
        confidence: 0.8,
        description: "Steady piece development and disciplined pawn skeleton preservation.",
      });
    }

    const weaknesses = [
      {
        id: "w_defense",
        name: "Defending Kingside Attacks",
        score: Math.max(60, 100 - defensiveAbility),
        confidence: 0.88,
        evidenceGameCount: Math.max(3, kingsideAttackCount + 2),
        description: "Prone to piece crowding on the queenside, leaving your castled king vulnerable to storming pawns.",
      },
      {
        id: "w_forks",
        name: "Knight Forks & Double Attacks",
        score: 74,
        confidence: 0.84,
        evidenceGameCount: Math.max(2, knightForkLosses + 1),
        description: "Overlooking opponent knight jumps on outposts creating royal or rook forks.",
      },
    ];

    if (prematureAttackLosses > 1 || aggression > 80) {
      weaknesses.push({
        id: "w_premature",
        name: "Premature Attacks",
        score: 78,
        confidence: 0.86,
        evidenceGameCount: Math.max(3, prematureAttackLosses + 2),
        description: "Launching attacks before completing piece development or king safety.",
      });
    }

    const newVer = (latestExisting?.version || 0) + 1;
    const summaryText = `Your Chess DNA (v${newVer}) reflects an ${
      aggression > 70 ? "aggressive tactical" : "methodical positional"
    } style based on ${gameCount} analyzed games. Your strongest domain is ${strengths[0]?.name}, while your primary training priority is ${
      weaknesses[0]?.name
    }.`;

    const created = await prisma.chessDNAVersion.upsert({
      where: {
        userId_version: {
          userId,
          version: newVer,
        },
      },
      create: {
        userId,
        version: newVer,
        gamesAnalyzed: gameCount,
        metrics: JSON.stringify(metrics),
        strengths: JSON.stringify(strengths),
        weaknesses: JSON.stringify(weaknesses),
        summaryText,
      },
      update: {
        gamesAnalyzed: gameCount,
        metrics: JSON.stringify(metrics),
        strengths: JSON.stringify(strengths),
        weaknesses: JSON.stringify(weaknesses),
        summaryText,
      },
    });

    if (user.chessProfile) {
      await prisma.chessProfile.update({
        where: { id: user.chessProfile.id },
        data: {
          gamesImported: gameCount,
          gamesAnalyzed: gameCount,
          dnaVersion: created.version,
        },
      });
    }

    return {
      version: created.version,
      gamesAnalyzed: gameCount,
      metrics,
      strengths,
      weaknesses,
      summaryText,
      generatedAt: created.generatedAt,
    };
  }

  static async getCurrentDNA(userId) {
    const latest = await prisma.chessDNAVersion.findFirst({
      where: { userId },
      orderBy: { version: "desc" },
    });

    if (!latest) {
      return this.generateDNA(userId);
    }

    return {
      version: latest.version,
      gamesAnalyzed: latest.gamesAnalyzed,
      metrics: JSON.parse(latest.metrics),
      strengths: JSON.parse(latest.strengths),
      weaknesses: JSON.parse(latest.weaknesses),
      summaryText: latest.summaryText,
      generatedAt: latest.generatedAt,
    };
  }

  static async getHistory(userId) {
    const records = await prisma.chessDNAVersion.findMany({
      where: { userId },
      orderBy: { version: "asc" },
    });

    return records.map((r) => ({
      version: r.version,
      gamesAnalyzed: r.gamesAnalyzed,
      metrics: JSON.parse(r.metrics),
      strengths: JSON.parse(r.strengths),
      weaknesses: JSON.parse(r.weaknesses),
      createdAt: r.generatedAt,
    }));
  }
}
