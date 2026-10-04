import { prisma } from "../../utils/prisma.js";

export class ChessDnaService {
  /**
   * Generates dynamic Chess DNA metrics from user's actual analyzed games in DB.
   */
  static async generateDnaForUser(userId) {
    const userProfile = await prisma.chessProfile.findUnique({
      where: { userId },
      include: {
        games: {
          where: { analyzed: true },
          include: {
            gameAnalysis: true,
            positionAnalyses: {
              where: { playerMove: true },
            },
          },
        },
      },
    });

    if (!userProfile || userProfile.games.length === 0) {
      // Return balanced initial default baseline metrics when no data exists yet
      return {
        aggression: 50,
        riskTaking: 50,
        tacticalPreference: 50,
        positionalPreference: 50,
        defensiveAbility: 50,
        sacrificeTendency: 50,
        tradingTendency: 50,
        openingDiversity: 50,
        endgameAbility: 50,
        kingSafety: 50,
        attackPreference: 50,
        simplificationPreference: 50,
        timePressureBehavior: 50,
        topStrengths: ["Insufficient game data analyzed yet"],
        topWeaknesses: ["Connect Chess.com to import & analyze games"],
      };
    }

    const games = userProfile.games;
    const totalGames = games.length;

    let totalCpLoss = 0;
    let totalBlunders = 0;
    let totalMistakes = 0;
    let totalInaccuracies = 0;
    let openingAccSum = 0;
    let middlegameAccSum = 0;
    let endgameAccSum = 0;
    let validAccCount = 0;
    const openingsSet = new Set();

    for (const g of games) {
      if (g.gameAnalysis) {
        totalCpLoss += g.gameAnalysis.avgCpLoss;
        totalBlunders += g.gameAnalysis.blunders;
        totalMistakes += g.gameAnalysis.mistakes;
        totalInaccuracies += g.gameAnalysis.inaccuracies;

        if (g.gameAnalysis.openingEco)
          openingsSet.add(g.gameAnalysis.openingEco);
        if (g.gameAnalysis.openingAccuracy !== null) {
          openingAccSum += g.gameAnalysis.openingAccuracy || 75;
          middlegameAccSum += g.gameAnalysis.middlegameAccuracy || 70;
          endgameAccSum += g.gameAnalysis.endgameAccuracy || 65;
          validAccCount++;
        }
      }
    }

    const avgCpLoss = totalCpLoss / totalGames;
    const avgBlundersPerGame = totalBlunders / totalGames;

    // Derived style formulas (0 - 100)
    const aggression = Math.min(
      95,
      Math.max(
        30,
        60 +
          (userProfile.games.filter((g) => g.result === "WIN").length /
            totalGames) *
            30 -
          avgCpLoss * 0.1,
      ),
    );
    const riskTaking = Math.min(95, Math.max(25, 45 + avgBlundersPerGame * 15));
    const tacticalPreference = Math.min(
      95,
      Math.max(30, 70 - avgBlundersPerGame * 10),
    );
    const positionalPreference = Math.min(
      95,
      Math.max(30, 100 - tacticalPreference),
    );
    const defensiveAbility = Math.min(95, Math.max(20, 85 - avgCpLoss * 0.5));
    const sacrificeTendency = Math.min(
      90,
      Math.max(15, 30 + avgBlundersPerGame * 12),
    );
    const tradingTendency = Math.min(90, Math.max(20, 50));
    const openingDiversity = Math.min(
      95,
      Math.max(20, (openingsSet.size / Math.max(totalGames, 1)) * 100),
    );
    const endgameAbility =
      validAccCount > 0
        ? Math.min(95, Math.max(20, endgameAccSum / validAccCount))
        : 60;
    const kingSafety = Math.min(95, Math.max(20, 90 - avgBlundersPerGame * 20));
    const attackPreference = Math.min(95, Math.max(25, aggression * 0.9 + 10));
    const simplificationPreference = Math.min(
      90,
      Math.max(20, 100 - aggression),
    );
    const timePressureBehavior = Math.min(
      95,
      Math.max(25, 80 - avgBlundersPerGame * 15),
    );

    // Dynamic Strengths & Weaknesses
    const topStrengths = [];
    const topWeaknesses = [];

    if (aggression > 65) topStrengths.push("Aggressive Attacking Play");
    if (defensiveAbility > 70) topStrengths.push("Solid Defensive Resilience");
    if (endgameAbility > 70) topStrengths.push("Strong Endgame Conversion");
    if (kingSafety > 75) topStrengths.push("Prudent King Safety Awareness");
    if (openingDiversity > 60) topStrengths.push("Diverse Opening Repertoire");
    if (topStrengths.length === 0)
      topStrengths.push("Balanced Overall Tactical Vision");

    if (avgBlundersPerGame > 1.2)
      topWeaknesses.push("Middlegame Tactical Blunders");
    if (endgameAbility < 55)
      topWeaknesses.push("Endgame Technique & Pawn Structure");
    if (kingSafety < 60)
      topWeaknesses.push("Exposed King under Opponent Attack");
    if (avgCpLoss > 60)
      topWeaknesses.push("Inaccurate Positional Decision Making");
    if (topWeaknesses.length === 0)
      topWeaknesses.push("Time Pressure Precision in Complex Positions");

    const metrics = {
      aggression: Math.round(aggression * 10) / 10,
      riskTaking: Math.round(riskTaking * 10) / 10,
      tacticalPreference: Math.round(tacticalPreference * 10) / 10,
      positionalPreference: Math.round(positionalPreference * 10) / 10,
      defensiveAbility: Math.round(defensiveAbility * 10) / 10,
      sacrificeTendency: Math.round(sacrificeTendency * 10) / 10,
      tradingTendency: Math.round(tradingTendency * 10) / 10,
      openingDiversity: Math.round(openingDiversity * 10) / 10,
      endgameAbility: Math.round(endgameAbility * 10) / 10,
      kingSafety: Math.round(kingSafety * 10) / 10,
      attackPreference: Math.round(attackPreference * 10) / 10,
      simplificationPreference: Math.round(simplificationPreference * 10) / 10,
      timePressureBehavior: Math.round(timePressureBehavior * 10) / 10,
      topStrengths,
      topWeaknesses,
    };

    // Save or update ChessDNA in database
    await prisma.chessDNA.upsert({
      where: { userId },
      create: {
        userId,
        ...metrics,
      },
      update: {
        ...metrics,
        version: { increment: 1 },
      },
    });

    return metrics;
  }
}
