import { prisma } from "../../utils/prisma.js";

/**
 * Long-Term Evolution & Progress Tracking Service
 * Distinguishes Training Improvement (deliberate drills) from
 * Gameplay Improvement (real analyzed Chess.com games).
 */
export class EvolutionService {
  /**
   * Minimum decisions required in a cohort for statistical confidence
   */
  static MIN_COHORT_DECISIONS = 30;

  /**
   * Configurable thresholds for model retraining eligibility
   */
  static RETRAINING_THRESHOLDS = {
    minNewGames: 30,
    minNewPositions: 500,
    minDnaDivergence: 15.0, // percent
    maxModelAgeDays: 60,
  };

  /**
   * Get comprehensive longitudinal evolution overview
   */
  static async getOverview(userId) {
    const profile = await prisma.chessProfile.findUnique({
      where: { userId },
      select: { id: true, chessUsername: true, joinedAt: true, createdAt: true },
    });

    if (!profile) {
      return {
        sufficientData: false,
        message: "No connected Chess.com profile found.",
      };
    }

    // 1. Fetch analyzed games in chronological order
    const games = await prisma.game.findMany({
      where: { chessProfileId: profile.id, analyzed: true },
      orderBy: { playedAt: "asc" },
      select: {
        id: true,
        playedAt: true,
        userColor: true,
        userRating: true,
        result: true,
        gameAnalysis: {
          select: {
            accuracy: true,
            avgCpLoss: true,
            blunders: true,
            mistakes: true,
            inaccuracies: true,
          },
        },
      },
    });

    if (games.length < 5) {
      return {
        sufficientData: false,
        message: "Not enough analyzed games yet to establish a reliable baseline.",
        requirements: { minimumGames: 5, currentGames: games.length },
      };
    }

    // 2. Establish Chronological Cohorts (Baseline vs Recent/Post-Training)
    // Baseline: First 50% of analyzed games
    // Recent: Later 50% of analyzed games
    const midIndex = Math.floor(games.length / 2);
    const baselineGames = games.slice(0, midIndex);
    const recentGames = games.slice(midIndex);

    const baselineGameIds = baselineGames.map((g) => g.id);
    const recentGameIds = recentGames.map((g) => g.id);

    // 3. Compute Longitudinal Gameplay Metrics via aggregated queries
    const baselineMetrics = await this._computeCohortMetrics(profile.id, baselineGameIds);
    const recentMetrics = await this._computeCohortMetrics(profile.id, recentGameIds);

    // 4. Fetch Training Data (Deliberate Practice)
    const trainingProgress = await prisma.trainingProgress.findUnique({
      where: { userId },
    });

    const completedSessionsCount = await prisma.trainingSession.count({
      where: { userId, status: "COMPLETED" },
    });

    const trainingMetrics = {
      totalSessionsCompleted: completedSessionsCount,
      totalPositionsAttempted: trainingProgress?.totalPositionsAttempted || 0,
      totalPositionsSolved: trainingProgress?.totalPositionsSolved || 0,
      trainingSuccessRate: trainingProgress?.overallSuccessRate || 0.0,
      categoryPerformance: trainingProgress?.categoryPerformance || {},
      currentDifficulty: trainingProgress?.currentDifficulty || "INTERMEDIATE",
      streakDays: trainingProgress?.streakDays || 0,
    };

    // 5. Training -> Gameplay Correlation Analysis
    const correlation = this._computeCorrelation(baselineMetrics, recentMetrics, trainingMetrics);

    // 6. Weakness Evolution
    const dna = await prisma.chessDNA.findUnique({
      where: { userId },
      select: { topWeaknesses: true, topStrengths: true, updatedAt: true },
    });

    const weaknessProgression = this._evaluateWeaknesses(
      dna?.topWeaknesses || [],
      baselineMetrics,
      recentMetrics,
      trainingProgress?.weaknessProgression || {}
    );

    // 7. Models & Current vs Peak Gap
    const modelComparison = await this._getModelComparison(userId);

    // 8. Model Update Eligibility
    const modelEligibility = await this.evaluateModelUpdateEligibility(userId, games.length);

    // 9. Evolution Score (Calculated honestly from verified metrics)
    const evolutionScore = modelComparison?.weaknessReductionRate != null
      ? Math.round(modelComparison.weaknessReductionRate * 100 * 10) / 10
      : null;

    return {
      sufficientData: true,
      user: {
        id: userId,
        chessUsername: profile.chessUsername,
        totalAnalyzedGames: games.length,
      },
      cohorts: {
        baseline: {
          name: `Baseline Cohort (Earliest ${baselineGames.length} Games)`,
          dateRange: {
            start: baselineGames[0]?.playedAt,
            end: baselineGames[baselineGames.length - 1]?.playedAt,
          },
          gamesCount: baselineGames.length,
          metrics: baselineMetrics,
        },
        recent: {
          name: `Recent / Post-Training Cohort (Latest ${recentGames.length} Games)`,
          dateRange: {
            start: recentGames[0]?.playedAt,
            end: recentGames[recentGames.length - 1]?.playedAt,
          },
          gamesCount: recentGames.length,
          metrics: recentMetrics,
        },
      },
      gameplayImprovement: {
        cplChangePct: baselineMetrics.avgCpl > 0
          ? Math.round(((recentMetrics.avgCpl - baselineMetrics.avgCpl) / baselineMetrics.avgCpl) * 1000) / 10
          : 0,
        blunderRateChangePct: baselineMetrics.blunderRate > 0
          ? Math.round(((recentMetrics.blunderRate - baselineMetrics.blunderRate) / baselineMetrics.blunderRate) * 1000) / 10
          : 0,
        mistakeRateChangePct: baselineMetrics.mistakeRate > 0
          ? Math.round(((recentMetrics.mistakeRate - baselineMetrics.mistakeRate) / baselineMetrics.mistakeRate) * 1000) / 10
          : 0,
        sampleSizeBaseline: baselineMetrics.totalDecisions,
        sampleSizeRecent: recentMetrics.totalDecisions,
      },
      trainingProgress: trainingMetrics,
      correlation,
      weaknessProgression,
      modelComparison,
      modelEligibility,
      evolutionScore,
    };
  }

  /**
   * Compute aggregated metrics for a specific cohort of games
   */
  static async _computeCohortMetrics(chessProfileId, gameIds) {
    if (!gameIds || gameIds.length === 0) {
      return {
        totalDecisions: 0,
        avgCpl: 0,
        blunderRate: 0,
        mistakeRate: 0,
        inaccuracyRate: 0,
        bestMoveRate: 0,
        categories: {},
      };
    }

    // Direct aggregation on PositionAnalysis
    const [counts, cplAgg, categoriesAgg] = await Promise.all([
      // Move classification counts
      prisma.$queryRaw`
        SELECT 
          classification,
          COUNT(*)::int as count
        FROM "PositionAnalysis"
        WHERE "gameId" = ANY(${gameIds})
          AND "playerMove" = true
        GROUP BY classification
      `,
      // Avg and median CPL
      prisma.$queryRaw`
        SELECT 
          ROUND(AVG("cpLoss")::numeric, 1)::float as "avgCpl",
          COUNT(*)::int as "totalDecisions"
        FROM "PositionAnalysis"
        WHERE "gameId" = ANY(${gameIds})
          AND "playerMove" = true
      `,
      // Categorical breakdown (tactical, defensive, endgame, etc.)
      prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN "gamePhase" = 'ENDGAME' THEN 'ENDGAME'
            WHEN "gamePhase" = 'OPENING' THEN 'OPENING'
            WHEN "kingSafetyScore" < -0.2 OR (classification = 'BLUNDER' AND "cpLoss" >= 150) THEN 'DEFENSIVE'
            WHEN "tacticalScore" > 0.35 OR classification = 'BLUNDER' THEN 'TACTICAL'
            ELSE 'POSITIONAL'
          END as category,
          COUNT(*)::int as "decisions",
          ROUND(AVG("cpLoss")::numeric, 1)::float as "avgCpl",
          SUM(CASE WHEN classification IN ('BLUNDER', 'MISTAKE') THEN 1 ELSE 0 END)::int as "errors"
        FROM "PositionAnalysis"
        WHERE "gameId" = ANY(${gameIds})
          AND "playerMove" = true
        GROUP BY 1
      `,
    ]);

    const totalDecisions = cplAgg[0]?.totalDecisions || 0;
    const avgCpl = cplAgg[0]?.avgCpl || 0;

    const classMap = {};
    for (const r of counts) {
      classMap[r.classification] = r.count;
    }

    const blunders = classMap["BLUNDER"] || 0;
    const mistakes = classMap["MISTAKE"] || 0;
    const inaccuracies = classMap["INACCURACY"] || 0;
    const bestMoves = classMap["BEST"] || 0;

    const blunderRate = totalDecisions > 0 ? Math.round((blunders / totalDecisions) * 1000) / 10 : 0;
    const mistakeRate = totalDecisions > 0 ? Math.round((mistakes / totalDecisions) * 1000) / 10 : 0;
    const inaccuracyRate = totalDecisions > 0 ? Math.round((inaccuracies / totalDecisions) * 1000) / 10 : 0;
    const bestMoveRate = totalDecisions > 0 ? Math.round((bestMoves / totalDecisions) * 1000) / 10 : 0;

    const categories = {};
    for (const cat of categoriesAgg) {
      const catDecisions = cat.decisions || 0;
      categories[cat.category] = {
        sampleSize: catDecisions,
        avgCpl: cat.avgCpl || 0,
        errorRate: catDecisions > 0 ? Math.round(((cat.errors || 0) / catDecisions) * 1000) / 10 : 0,
      };
    }

    return {
      totalDecisions,
      avgCpl,
      blunderRate,
      mistakeRate,
      inaccuracyRate,
      bestMoveRate,
      categories,
    };
  }

  /**
   * Correlate deliberate training practice with subsequent gameplay metrics
   * Maintains strict separation: does NOT claim causation without controlled experimental evidence.
   */
  static _computeCorrelation(baseline, recent, training) {
    const categories = ["TACTICAL", "DEFENSIVE", "POSITIONAL", "ENDGAME", "OPENING"];
    const correlations = [];

    const trainingCategoryPerf = training.categoryPerformance || {};

    for (const cat of categories) {
      const trainStats = trainingCategoryPerf[cat] || { attempted: 0, solved: 0, successRate: 0 };
      const baseStats = baseline.categories[cat] || { avgCpl: 0, errorRate: 0, sampleSize: 0 };
      const recentStats = recent.categories[cat] || { avgCpl: 0, errorRate: 0, sampleSize: 0 };

      const cplChange = baseStats.avgCpl > 0
        ? Math.round(((recentStats.avgCpl - baseStats.avgCpl) / baseStats.avgCpl) * 1000) / 10
        : 0;

      const errorRateChange = baseStats.errorRate > 0
        ? Math.round(((recentStats.errorRate - baseStats.errorRate) / baseStats.errorRate) * 1000) / 10
        : 0;

      const hasSufficientEvidence = recentStats.sampleSize >= this.MIN_COHORT_DECISIONS;

      correlations.push({
        category: cat,
        trainingPositionsAttempted: trainStats.attempted,
        trainingPositionsSolved: trainStats.solved,
        trainingSuccessRate: Math.round(trainStats.successRate || 0),
        gameplayBaselineCpl: baseStats.avgCpl,
        gameplayRecentCpl: recentStats.avgCpl,
        cplChangePct: cplChange,
        errorRateChangePct: errorRateChange,
        gameplaySampleSize: recentStats.sampleSize,
        evidenceStatus: hasSufficientEvidence ? "SUFFICIENT" : "INSUFFICIENT_EVIDENCE",
        empiricalObservation: trainStats.attempted > 0
          ? `Training position success rate was ${Math.round(trainStats.successRate || 0)}% across ${trainStats.attempted} drills. In subsequent games, ${cat.toLowerCase()} CPL changed by ${cplChange}% (N = ${recentStats.sampleSize} decisions).`
          : `No targeted drills completed in ${cat.toLowerCase()} yet.`,
      });
    }

    return {
      disclaimer: "Empirical correlation tracks training success and subsequent gameplay metrics. Correlation does not imply direct causation.",
      categories: correlations,
    };
  }

  /**
   * Track weakness progression with honest evidence-backed statuses
   */
  static _evaluateWeaknesses(topWeaknesses, baseline, recent, trainingWeaknessProg) {
    if (!topWeaknesses || topWeaknesses.length === 0) {
      return [];
    }

    return topWeaknesses.map((weaknessName) => {
      // Map weakness title to chess domain category
      let categoryKey = "TACTICAL";
      const lower = weaknessName.toLowerCase();
      if (lower.includes("king") || lower.includes("defens")) categoryKey = "DEFENSIVE";
      else if (lower.includes("endgame") || lower.includes("pawn")) categoryKey = "ENDGAME";
      else if (lower.includes("positional")) categoryKey = "POSITIONAL";
      else if (lower.includes("opening")) categoryKey = "OPENING";

      const baseCat = baseline.categories[categoryKey] || { avgCpl: 0, errorRate: 0, sampleSize: 0 };
      const recentCat = recent.categories[categoryKey] || { avgCpl: 0, errorRate: 0, sampleSize: 0 };
      const trainProg = trainingWeaknessProg[weaknessName] || { attempted: 0, solved: 0 };

      // Determine status
      let status = "INSUFFICIENT_EVIDENCE";
      let trendDescription = "Awaiting more analyzed games to determine trajectory.";

      if (recentCat.sampleSize >= this.MIN_COHORT_DECISIONS) {
        const cplDelta = recentCat.avgCpl - baseCat.avgCpl;
        if (cplDelta <= -15 || recentCat.errorRate < baseCat.errorRate - 2.0) {
          status = "IMPROVING";
          trendDescription = `Decisive reduction in ${categoryKey.toLowerCase()} errors and CPL across ${recentCat.sampleSize} decisions.`;
        } else if (Math.abs(cplDelta) < 15) {
          status = "STABLE";
          trendDescription = `Error frequency has stabilized near baseline level. Continued deliberate practice recommended.`;
        } else {
          status = "WORSENING";
          trendDescription = `Elevated error rate detected in recent games. Prioritize targeted drills.`;
        }
      }

      return {
        weakness: weaknessName,
        category: categoryKey,
        status,
        baselineErrorRate: baseCat.errorRate,
        recentErrorRate: recentCat.errorRate,
        baselineCpl: baseCat.avgCpl,
        recentCpl: recentCat.avgCpl,
        trainingDrillsAttempted: trainProg.attempted,
        trainingDrillsSolved: trainProg.solved,
        sampleSize: recentCat.sampleSize,
        trendDescription,
      };
    });
  }

  /**
   * Fetch model comparison data and Current vs Peak behavioral gap
   */
  static async _getModelComparison(userId) {
    const peakSelf = await prisma.mLModelVersion.findFirst({
      where: { userId, modelType: "PEAK_SELF", status: "READY" },
      orderBy: { version: "desc" },
    });

    if (!peakSelf) return null;

    let currentSelf = null;
    if (peakSelf.dependentModelVersionId) {
      currentSelf = await prisma.mLModelVersion.findUnique({
        where: { id: peakSelf.dependentModelVersionId },
      });
    } else {
      currentSelf = await prisma.mLModelVersion.findFirst({
        where: { userId, modelType: "CURRENT_SELF", status: "READY" },
        orderBy: { version: "desc" },
      });
    }

    if (!currentSelf) return null;

    const parseMetrics = (m) => {
      if (!m) return {};
      if (typeof m === "string") {
        try {
          return JSON.parse(m);
        } catch {
          return {};
        }
      }
      return m;
    };

    const peakM = parseMetrics(peakSelf.metrics);
    const currentM = parseMetrics(currentSelf.metrics);
    const peakBehav = parseMetrics(peakSelf.behavioralMetrics);

    const weaknessReduction = peakBehav.weaknessReductionRate ?? null;
    const styleCollapse = peakBehav.styleCollapseRate ?? null;
    const engineRankDist = peakBehav.engineRankDistance ?? null;

    return {
      currentSelf: {
        id: currentSelf.id,
        version: currentSelf.version,
        status: currentSelf.status,
        top1Accuracy: currentM.top1 != null ? Math.round(currentM.top1 * 1000) / 10 : null,
        top3Accuracy: currentM.top3 != null ? Math.round(currentM.top3 * 1000) / 10 : null,
        gamesUsed: currentSelf.gamesUsed,
        trainedAt: currentSelf.createdAt,
      },
      peakSelf: {
        id: peakSelf.id,
        version: peakSelf.version,
        status: peakSelf.status,
        top1Accuracy: peakM.top1 != null ? Math.round(peakM.top1 * 1000) / 10 : null,
        top3Accuracy: peakM.top3 != null ? Math.round(peakM.top3 * 1000) / 10 : null,
        gamesUsed: peakSelf.gamesUsed,
        dependentModelVersionId: peakSelf.dependentModelVersionId,
        trainedAt: peakSelf.createdAt,
      },
      behavioralGap: {
        top1Delta: (peakM.top1 != null && currentM.top1 != null)
          ? Math.round((peakM.top1 - currentM.top1) * 1000) / 10
          : null,
        engineRankDistance: engineRankDist != null ? Math.round(engineRankDist * 100) / 100 : null,
        weaknessReductionRate: weaknessReduction != null ? Math.round(weaknessReduction * 1000) / 10 : null,
        stylePreservationRate: engineRankDist != null ? Math.round((1 - engineRankDist) * 1000) / 10 : null,
        styleCollapseRate: styleCollapse != null ? Math.round(styleCollapse * 1000) / 10 : null,
      },
      weaknessReductionRate: weaknessReduction,
    };
  }

  /**
   * Evaluate whether new data warrants model retraining
   */
  static async evaluateModelUpdateEligibility(userId, totalAnalyzedGames = null) {
    if (totalAnalyzedGames === null) {
      const profile = await prisma.chessProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!profile) return { status: "NO_UPDATE_NEEDED", reasons: ["No profile found"] };
      totalAnalyzedGames = await prisma.game.count({
        where: { chessProfileId: profile.id, analyzed: true },
      });
    }

    const latestModel = await prisma.mLModelVersion.findFirst({
      where: { userId, status: "READY" },
      orderBy: { createdAt: "desc" },
    });

    const gamesUsedAtTraining = latestModel?.gamesUsed || 0;
    const newGamesCount = Math.max(0, totalAnalyzedGames - gamesUsedAtTraining);

    const reasons = [];
    let status = "NO_UPDATE_NEEDED";

    if (newGamesCount >= this.RETRAINING_THRESHOLDS.minNewGames) {
      status = "RETRAINING_ELIGIBLE";
      reasons.push(`${newGamesCount} new analyzed games since last model training (threshold: ${this.RETRAINING_THRESHOLDS.minNewGames}).`);
      reasons.push("Sufficient fresh gameplay data available for model version increment.");
    } else if (newGamesCount > 0) {
      status = "NEW_DATA_AVAILABLE";
      reasons.push(`${newGamesCount} new games accumulated. Requires ${this.RETRAINING_THRESHOLDS.minNewGames - newGamesCount} more games to trigger model retraining.`);
    } else {
      reasons.push("Active models are fully synchronized with all analyzed games in the database.");
    }

    // Persist or update ModelUpdateCandidate record
    const candidate = await prisma.modelUpdateCandidate.upsert({
      where: { userId },
      create: {
        userId,
        status,
        newGamesSinceLastTrain: newGamesCount,
        newPositionsSinceLastTrain: newGamesCount * 60, // approx
        eligibilityReasons: reasons,
        lastEvaluatedAt: new Date(),
      },
      update: {
        status,
        newGamesSinceLastTrain: newGamesCount,
        newPositionsSinceLastTrain: newGamesCount * 60,
        eligibilityReasons: reasons,
        lastEvaluatedAt: new Date(),
      },
    });

    return {
      status: candidate.status,
      newGamesSinceLastTrain: candidate.newGamesSinceLastTrain,
      threshold: this.RETRAINING_THRESHOLDS.minNewGames,
      reasons: candidate.eligibilityReasons,
      lastEvaluatedAt: candidate.lastEvaluatedAt,
    };
  }

  /**
   * Build chronological timeline of real milestones from database
   */
  static async getTimeline(userId) {
    const profile = await prisma.chessProfile.findUnique({
      where: { userId },
      select: { id: true, chessUsername: true, createdAt: true, joinedAt: true },
    });

    if (!profile) return { events: [] };

    const events = [];

    // 1. Profile connected milestone
    events.push({
      date: profile.createdAt,
      type: "ACCOUNT_CONNECTED",
      title: "Chess.com Profile Synchronized",
      description: `Account @${profile.chessUsername} connected to Chess Evolve pipeline.`,
      metadata: { username: profile.chessUsername },
    });

    // 2. Earliest game analyzed
    const firstGame = await prisma.game.findFirst({
      where: { chessProfileId: profile.id, analyzed: true },
      orderBy: { playedAt: "asc" },
      select: { playedAt: true, id: true },
    });

    if (firstGame) {
      events.push({
        date: firstGame.playedAt,
        type: "BASELINE_ESTABLISHED",
        title: "Historical Baseline Established",
        description: "Initial cohort of historical Chess.com games analyzed with Stockfish.",
        metadata: { gameId: firstGame.id },
      });
    }

    // 3. Chess DNA records
    const dna = await prisma.chessDNA.findUnique({
      where: { userId },
      select: { createdAt: true, topWeaknesses: true },
    });

    if (dna) {
      events.push({
        date: dna.createdAt,
        type: "DNA_GENERATION",
        title: "Chess DNA Generated",
        description: `Personality matrix extracted. Identified ${dna.topWeaknesses?.length || 0} primary tactical and strategic weaknesses.`,
        metadata: { topWeaknesses: dna.topWeaknesses },
      });
    }

    // 4. ML Models
    const models = await prisma.mLModelVersion.findMany({
      where: { userId, status: "READY" },
      orderBy: { createdAt: "asc" },
    });

    for (const m of models) {
      events.push({
        date: m.createdAt,
        type: "MODEL_TRAINED",
        title: `${m.modelType === "CURRENT_SELF" ? "Current Self" : "Peak Self"} v${m.version} Trained`,
        description: `PyTorch model trained on ${m.gamesUsed} games and ${m.positionsUsed} positions. Quality gate passed.`,
        metadata: {
          modelType: m.modelType,
          version: m.version,
          gamesUsed: m.gamesUsed,
        },
      });
    }

    // 5. Training Sessions
    const sessions = await prisma.trainingSession.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "asc" },
      select: {
        id: true,
        title: true,
        category: true,
        score: true,
        completedAt: true,
      },
    });

    for (const s of sessions) {
      events.push({
        date: s.completedAt,
        type: "TRAINING_SESSION",
        title: `Training Completed: ${s.title}`,
        description: `Deliberate practice drill (${s.category}). Score: ${s.score}%.`,
        metadata: {
          sessionId: s.id,
          category: s.category,
          score: s.score,
        },
      });
    }

    // Sort descending (newest first)
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    return { events };
  }

  /**
   * Longitudinal gameplay progression across chronological quartiles
   */
  static async getGameplayMetrics(userId) {
    const profile = await prisma.chessProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) return { quartiles: [] };

    const games = await prisma.game.findMany({
      where: { chessProfileId: profile.id, analyzed: true },
      orderBy: { playedAt: "asc" },
      select: { id: true, playedAt: true },
    });

    if (games.length < 4) return { quartiles: [] };

    // Split into 4 chronological cohorts
    const qSize = Math.ceil(games.length / 4);
    const quartiles = [];

    for (let i = 0; i < 4; i++) {
      const qGames = games.slice(i * qSize, (i + 1) * qSize);
      if (qGames.length === 0) continue;

      const qIds = qGames.map((g) => g.id);
      const metrics = await this._computeCohortMetrics(profile.id, qIds);

      quartiles.push({
        cohort: `Cohort Q${i + 1}`,
        gamesCount: qGames.length,
        startDate: qGames[0].playedAt,
        endDate: qGames[qGames.length - 1].playedAt,
        avgCpl: metrics.avgCpl,
        blunderRate: metrics.blunderRate,
        mistakeRate: metrics.mistakeRate,
        inaccuracyRate: metrics.inaccuracyRate,
        bestMoveRate: metrics.bestMoveRate,
        totalDecisions: metrics.totalDecisions,
      });
    }

    return { quartiles };
  }

  /**
   * Generate and persist an immutable EvolutionSnapshot record
   */
  static async generateSnapshot(userId, sourceType = "CURRENT", notes = null) {
    const overview = await this.getOverview(userId);
    if (!overview.sufficientData) {
      throw new Error("Insufficient analyzed games to generate an evolution snapshot.");
    }

    const { cohorts, trainingProgress, modelComparison } = overview;
    const currentCohort = cohorts.recent;

    const snapshot = await prisma.evolutionSnapshot.create({
      data: {
        userId,
        sourceType,
        cohortName: currentCohort.name,
        startGameDate: currentCohort.dateRange.start,
        endGameDate: currentCohort.dateRange.end,
        gamesAnalyzed: currentCohort.gamesCount,
        positionsAnalyzed: currentCohort.metrics.totalDecisions,
        sampleSizeDecisions: currentCohort.metrics.totalDecisions,
        avgCPL: currentCohort.metrics.avgCpl,
        blunderRate: currentCohort.metrics.blunderRate,
        mistakeRate: currentCohort.metrics.mistakeRate,
        inaccuracyRate: currentCohort.metrics.inaccuracyRate,
        engineTop1Rate: currentCohort.metrics.bestMoveRate,
        categoryMetrics: currentCohort.metrics.categories,
        trainingPositionsAttempted: trainingProgress.totalPositionsAttempted,
        trainingPositionsSolved: trainingProgress.totalPositionsSolved,
        trainingSuccessRate: trainingProgress.trainingSuccessRate,
        weaknessMetrics: overview.weaknessProgression,
        currentSelfModelVersion: modelComparison?.currentSelf?.version || null,
        peakSelfModelVersion: modelComparison?.peakSelf?.version || null,
        notes,
      },
    });

    return snapshot;
  }
}
