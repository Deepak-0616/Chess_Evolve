import { Chess } from "chess.js";
import { prisma } from "../../utils/prisma.js";
import { PositionSelector } from "./positionSelector.js";
import { TrainingExplainer } from "./trainingExplainer.js";
import { MLServiceBridge } from "../ml/mlService.js";

export class TrainingService {
  /**
   * Minimum analyzed player positions needed to build a personalized plan
   */
  static MINIMUM_POSITIONS = 5;

  static async resolveUserProfile(userId) {
    let profile = await prisma.chessProfile.findUnique({
      where: { userId },
      select: { id: true, chessUsername: true },
    });

    if (!profile) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (user?.email) {
        profile = await prisma.chessProfile.findFirst({
          where: { user: { email: user.email } },
          select: { id: true, chessUsername: true },
          orderBy: { updatedAt: "desc" },
        });
      }
    }

    if (profile) {
      const count = await prisma.game.count({ where: { chessProfileId: profile.id } });
      if (count === 0 && profile.chessUsername) {
        const alt = await prisma.chessProfile.findFirst({
          where: {
            chessUsername: { equals: profile.chessUsername, mode: "insensitive" },
            games: { some: {} },
          },
          select: { id: true, chessUsername: true },
          orderBy: { updatedAt: "desc" },
        });
        if (alt) profile = alt;
      }
    }

    return profile;
  }

  /**
   * Get user's training overview, active plan, weaknesses, and progress
   */
  static async getOverview(userId) {
    // 1. Check user profile and analyzed game data
    const profile = await TrainingService.resolveUserProfile(userId);

    if (!profile) {
      return {
        sufficientData: false,
        message: "No connected Chess.com profile found. Please connect your profile to enable personalized training.",
        requirements: { minimumPositions: TrainingService.MINIMUM_POSITIONS, currentPositions: 0, analyzedGames: 0 },
      };
    }

    const analyzedGamesCount = await prisma.game.count({
      where: { chessProfileId: profile.id, analyzed: true },
    });

    // Count positions with player mistakes
    const playerPositionsCount = await prisma.positionAnalysis.count({
      where: {
        playerMove: true,
        game: { chessProfileId: profile.id },
      },
    });

    if (playerPositionsCount < TrainingService.MINIMUM_POSITIONS) {
      return {
        sufficientData: false,
        message: "Not enough analyzed games yet to build a personalized training plan.",
        requirements: {
          minimumPositions: TrainingService.MINIMUM_POSITIONS,
          currentPositions: playerPositionsCount,
          analyzedGames: analyzedGamesCount,
        },
      };
    }

    // 2. Fetch user's ChessDNA for verified weaknesses
    const dna = await prisma.chessDNA.findUnique({
      where: { userId },
      select: {
        topWeaknesses: true,
        topStrengths: true,
        tacticalPreference: true,
        defensiveAbility: true,
        positionalPreference: true,
        endgameAbility: true,
      },
    });

    const weaknesses = (dna?.topWeaknesses && Array.isArray(dna.topWeaknesses))
      ? dna.topWeaknesses
      : ["Middlegame Tactical Decision Making", "Defensive King Safety"];

    // 3. Fetch active TrainingPlan
    let activePlan = await prisma.trainingPlan.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    // If no active plan, auto-generate one based on top weakness
    if (!activePlan) {
      const topWeakness = weaknesses[0] || "Tactical Calculation";
      let focusCat = "TACTICAL";
      if (topWeakness.toLowerCase().includes("defensive") || topWeakness.toLowerCase().includes("king")) focusCat = "DEFENSIVE";
      else if (topWeakness.toLowerCase().includes("endgame")) focusCat = "ENDGAME";
      else if (topWeakness.toLowerCase().includes("positional")) focusCat = "POSITIONAL";

      activePlan = await prisma.trainingPlan.create({
        data: {
          userId,
          status: "ACTIVE",
          focusCategory: focusCat,
          targetWeakness: topWeakness,
          difficulty: "INTERMEDIATE",
        },
      });
    }

    // 4. Fetch recent sessions
    const recentSessions = await prisma.trainingSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        difficulty: true,
        status: true,
        positionsPlanned: true,
        positionsCompleted: true,
        score: true,
        createdAt: true,
        completedAt: true,
      },
    });

    // 5. Fetch training progress
    let progress = await prisma.trainingProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      progress = await prisma.trainingProgress.create({
        data: {
          userId,
          currentDifficulty: "INTERMEDIATE",
        },
      });
    }

    // 6. Check available ML models for preview
    const models = await prisma.mLModelVersion.findMany({
      where: { userId, status: "READY" },
      select: { modelType: true, version: true, metrics: true },
    });

    return {
      sufficientData: true,
      user: {
        id: userId,
        chessUsername: profile.chessUsername,
      },
      activePlan,
      weaknesses,
      strengths: dna?.topStrengths || [],
      progress: {
        totalSessionsCompleted: progress.totalSessionsCompleted,
        totalPositionsAttempted: progress.totalPositionsAttempted,
        totalPositionsSolved: progress.totalPositionsSolved,
        overallSuccessRate: progress.overallSuccessRate,
        categoryPerformance: progress.categoryPerformance,
        currentDifficulty: progress.currentDifficulty,
        streakDays: progress.streakDays,
        lastTrainingDate: progress.lastTrainingDate,
      },
      recentSessions,
      availableModels: models.map((m) => m.modelType),
    };
  }

  /**
   * Create a new training session with real positions from user games
   */
  static async createSession(userId, { category, difficulty, targetWeakness, planId } = {}) {
    // 1. Fetch user's profile and plan
    const profile = await TrainingService.resolveUserProfile(userId);

    if (!profile) {
      throw new Error("No connected Chess.com profile found.");
    }

    const plan = planId
      ? await prisma.trainingPlan.findFirst({ where: { id: planId, userId } })
      : await prisma.trainingPlan.findFirst({ where: { userId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } });

    const selectedCategory = category || plan?.focusCategory || "TACTICAL";
    const selectedDifficulty = difficulty || plan?.difficulty || "INTERMEDIATE";
    const selectedWeakness = targetWeakness || plan?.targetWeakness || `${selectedCategory} Improvement`;

    // 2. Select positions using PositionSelector
    const { positions: candidatePositions, exclusions } = await PositionSelector.selectPositionsForUser(userId, {
      category: selectedCategory,
      limit: 5,
      targetDifficulty: selectedDifficulty,
    });

    if (candidatePositions.length === 0) {
      // Fallback: try without category restriction if specific category had too few mistakes
      const fallback = await PositionSelector.selectPositionsForUser(userId, { limit: 5 });
      if (fallback.positions.length === 0) {
        throw new Error("Not enough analyzed mistake positions found in your games to create this session.");
      }
      candidatePositions.push(...fallback.positions);
    }

    // 3. Fetch READY models for this user for inference
    const currentSelfModel = await prisma.mLModelVersion.findFirst({
      where: { userId, modelType: "CURRENT_SELF", status: "READY" },
      orderBy: { version: "desc" },
    });

    const peakSelfModel = await prisma.mLModelVersion.findFirst({
      where: { userId, modelType: "PEAK_SELF", status: "READY" },
      orderBy: { version: "desc" },
    });

    // 4. Precompute Current Self & Peak Self predictions for the positions
    for (const pos of candidatePositions) {
      let csPred = null;
      let psPred = null;

      if (currentSelfModel) {
        try {
          csPred = await MLServiceBridge.getModelPrediction({
            userId,
            fen: pos.fen,
            candidates: pos.candidateMoves,
            moveNumber: pos.moveNumber,
            gamePhase: pos.metadata?.gamePhase || "MIDDLEGAME",
            modelVersionId: currentSelfModel.id,
            modelType: "CURRENT_SELF",
          });
        } catch (e) {
          // graceful fallback
        }
      }

      if (peakSelfModel) {
        try {
          psPred = await MLServiceBridge.getModelPrediction({
            userId,
            fen: pos.fen,
            candidates: pos.candidateMoves,
            moveNumber: pos.moveNumber,
            gamePhase: pos.metadata?.gamePhase || "MIDDLEGAME",
            modelVersionId: peakSelfModel.id,
            modelType: "PEAK_SELF",
          });
        } catch (e) {
          // graceful fallback
        }
      }

      pos.metadata = {
        ...pos.metadata,
        currentSelfPrediction: csPred?.recommendedMove ? csPred : null,
        peakSelfPrediction: psPred?.recommendedMove ? psPred : null,
      };
    }

    // 5. Create Session and Positions in a Prisma transaction
    const session = await prisma.$transaction(async (tx) => {
      const createdSession = await tx.trainingSession.create({
        data: {
          userId,
          trainingPlanId: plan?.id || null,
          targetWeakness: selectedWeakness,
          title: `Personalized Drill: ${selectedWeakness}`,
          description: `Interactive training drill built from your real Chess.com games (${profile.chessUsername}).`,
          category: selectedCategory,
          difficulty: selectedDifficulty,
          positionsPlanned: candidatePositions.length,
          positionsCompleted: 0,
          status: "IN_PROGRESS",
        },
      });

      const positionRecords = candidatePositions.map((cp, i) => ({
        userId,
        trainingPlanId: plan?.id || null,
        trainingSessionId: createdSession.id,
        gameId: cp.gameId,
        positionAnalysisId: cp.positionAnalysisId,
        moveNumber: cp.moveNumber,
        fen: cp.fen,
        sideToMove: cp.sideToMove,
        weaknessCategory: cp.weaknessCategory,
        weaknessScore: cp.weaknessScore,
        recurrenceScore: cp.recurrenceScore,
        priorityScore: cp.priorityScore,
        difficulty: cp.difficulty,
        targetMove: cp.targetMove,
        targetMoveUci: cp.targetMoveUci || null,
        playerHistoricalMove: cp.playerHistoricalMove,
        playerHistoricalClass: cp.playerHistoricalClass,
        playerHistoricalCpLoss: cp.playerHistoricalCpLoss,
        candidateMoves: cp.candidateMoves,
        metadata: cp.metadata,
        orderIndex: i + 1,
      }));

      await tx.trainingPosition.createMany({
        data: positionRecords,
      });

      return createdSession;
    }, { timeout: 25000 });

    return TrainingService.getSession(userId, session.id);
  }

  /**
   * Get session details with sanitized positions (no answers leaked to client)
   */
  static async getSession(userId, sessionId) {
    const session = await prisma.trainingSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        positions: {
          orderBy: { orderIndex: "asc" },
          include: {
            attempts: {
              where: { userId },
              orderBy: { attemptedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!session) {
      throw new Error("Training session not found or unauthorized.");
    }

    // Security sanitization: Strip targetMove, targetMoveUci, and answer data
    // for positions that haven't been attempted yet!
    const sanitizedPositions = session.positions.map((pos) => {
      const latestAttempt = pos.attempts[0] || null;
      const isAttempted = !!latestAttempt;

      if (!isAttempted && session.status !== "COMPLETED") {
        return {
          id: pos.id,
          orderIndex: pos.orderIndex,
          fen: pos.fen,
          sideToMove: pos.sideToMove,
          moveNumber: pos.moveNumber,
          difficulty: pos.difficulty,
          weaknessCategory: pos.weaknessCategory,
          playerHistoricalMove: pos.playerHistoricalMove,
          playerHistoricalClass: pos.playerHistoricalClass,
          isAttempted: false,
          attempt: null,
          // CRITICAL: targetMove and predictions are omitted until attempted!
        };
      }

      // If already attempted, provide full details and attempt result
      const meta = typeof pos.metadata === "object" ? pos.metadata : {};
      return {
        id: pos.id,
        orderIndex: pos.orderIndex,
        fen: pos.fen,
        sideToMove: pos.sideToMove,
        moveNumber: pos.moveNumber,
        difficulty: pos.difficulty,
        weaknessCategory: pos.weaknessCategory,
        targetMove: pos.targetMove,
        playerHistoricalMove: pos.playerHistoricalMove,
        playerHistoricalClass: pos.playerHistoricalClass,
        isAttempted: true,
        attempt: latestAttempt,
        currentSelfMove: meta.currentSelfPrediction?.recommendedMove || null,
        peakSelfMove: meta.peakSelfPrediction?.recommendedMove || null,
      };
    });

    return {
      session: {
        id: session.id,
        title: session.title,
        description: session.description,
        targetWeakness: session.targetWeakness,
        category: session.category,
        difficulty: session.difficulty,
        status: session.status,
        positionsPlanned: session.positionsPlanned,
        positionsCompleted: session.positionsCompleted,
        score: session.score,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      },
      positions: sanitizedPositions,
    };
  }

  /**
   * Submit an attempt on a training position with chess.js validation
   */
  static async submitAttempt(userId, sessionId, { positionId, move, timeSpentMs = 0 }) {
    if (!move || typeof move !== "string") {
      throw new Error("A valid chess move string is required.");
    }

    // 1. Verify session ownership
    const session = await prisma.trainingSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error("Training session not found or unauthorized.");
    }

    if (session.status === "COMPLETED") {
      throw new Error("Training session is already completed.");
    }

    // 2. Verify position belongs to session and user
    const position = await prisma.trainingPosition.findFirst({
      where: { id: positionId, trainingSessionId: sessionId, userId },
    });

    if (!position) {
      throw new Error("Training position not found in this session.");
    }

    // Check if position was already attempted
    const existingAttempt = await prisma.trainingAttempt.findFirst({
      where: { trainingPositionId: positionId, userId },
    });

    if (existingAttempt) {
      throw new Error("This position has already been attempted in this session.");
    }

    // 3. Authoritative chess.js validation
    let chess;
    try {
      chess = new Chess(position.fen);
    } catch (e) {
      throw new Error("Internal error: corrupted position FEN.");
    }

    let moveObj = null;
    const cleanMove = move.trim();

    // Try SAN first (e.g. "Nf3", "e4", "O-O")
    try {
      moveObj = chess.move(cleanMove);
    } catch (e) {
      // If SAN fails, try UCI / from-to (e.g. "g1f3", "e2e4")
      if (cleanMove.length >= 4) {
        try {
          const from = cleanMove.slice(0, 2);
          const to = cleanMove.slice(2, 4);
          const promotion = cleanMove.length === 5 ? cleanMove[4] : undefined;
          moveObj = chess.move({ from, to, promotion });
        } catch (e2) {
          // invalid
        }
      }
    }

    if (!moveObj) {
      throw new Error(`Illegal move '${cleanMove}' for position.`);
    }

    const submittedSan = moveObj.san;
    const submittedUci = `${moveObj.from}${moveObj.to}${moveObj.promotion || ""}`;

    // 4. Compare move against candidates & target
    const targetMove = position.targetMove;
    const candidates = Array.isArray(position.candidateMoves) ? position.candidateMoves : [];

    // Find rank and cpLoss
    let engineRank = null;
    let cpLoss = null;

    // Check exact match with targetMove
    if (submittedSan.toLowerCase() === targetMove.toLowerCase() || submittedUci.toLowerCase() === targetMove.toLowerCase()) {
      engineRank = 1;
      cpLoss = 0.0;
    } else {
      // Find in candidates
      for (const cand of candidates) {
        if (cand.move && (cand.move.toLowerCase() === submittedSan.toLowerCase() || cand.move.toLowerCase() === submittedUci.toLowerCase())) {
          engineRank = cand.rank;
          const topScore = candidates[0]?.score || 0;
          cpLoss = Math.max(0, Math.round((topScore - (cand.score || 0)) * 100));
          break;
        }
      }

      // If not in top candidates, estimate CPL
      if (engineRank === null) {
        engineRank = candidates.length + 1;
        cpLoss = 200.0; // Substantial mistake outside top engine candidates
      }
    }

    const isCorrect = engineRank === 1 || (cpLoss !== null && cpLoss <= 25);
    const quality = TrainingExplainer.determineMoveQuality(engineRank, cpLoss);

    // 5. Extract model predictions from position metadata
    const meta = typeof position.metadata === "object" ? position.metadata : {};
    const csPred = meta.currentSelfPrediction;
    const psPred = meta.peakSelfPrediction;

    // 6. Generate deterministic explanation
    const explanation = TrainingExplainer.generateExplanation({
      submittedMove: submittedSan,
      targetMove,
      quality,
      engineRank,
      cpLoss,
      playerHistoricalMove: position.playerHistoricalMove,
      playerHistoricalClass: position.playerHistoricalClass,
      currentSelfMove: csPred?.recommendedMove || null,
      currentSelfConfidence: csPred?.confidence || null,
      peakSelfMove: psPred?.recommendedMove || null,
      peakSelfConfidence: psPred?.confidence || null,
      category: position.weaknessCategory,
      fen: position.fen,
    });

    // 7. Atomic transaction: create attempt, update session, update progress
    const result = await prisma.$transaction(async (tx) => {
      const attempt = await tx.trainingAttempt.create({
        data: {
          userId,
          trainingSessionId: sessionId,
          trainingPositionId: positionId,
          submittedMove: submittedSan,
          submittedMoveUci: submittedUci,
          isCorrect,
          quality,
          engineRank,
          cpLoss,
          currentSelfMove: csPred?.recommendedMove || null,
          currentSelfConfidence: csPred?.confidence || null,
          peakSelfMove: psPred?.recommendedMove || null,
          peakSelfConfidence: psPred?.confidence || null,
          explanation,
          timeSpentMs: timeSpentMs || 0,
        },
      });

      // Update session completed count
      const updatedPositionsCompleted = session.positionsCompleted + 1;
      const allAttempts = await tx.trainingAttempt.findMany({
        where: { trainingSessionId: sessionId },
        select: { isCorrect: true },
      });
      const correctCount = allAttempts.filter((a) => a.isCorrect).length;
      const sessionScore = Math.round((correctCount / session.positionsPlanned) * 100);

      const isSessionFinished = updatedPositionsCompleted >= session.positionsPlanned;

      await tx.trainingSession.update({
        where: { id: sessionId },
        data: {
          positionsCompleted: updatedPositionsCompleted,
          score: sessionScore,
          status: isSessionFinished ? "COMPLETED" : "IN_PROGRESS",
          completedAt: isSessionFinished ? new Date() : null,
        },
      });

      // Update TrainingProgress
      let prog = await tx.trainingProgress.findUnique({ where: { userId } });
      if (!prog) {
        prog = await tx.trainingProgress.create({ data: { userId } });
      }

      const categoryPerf = (typeof prog.categoryPerformance === "object" && prog.categoryPerformance) ? { ...prog.categoryPerformance } : {};
      const cat = position.weaknessCategory || "TACTICAL";
      const catData = categoryPerf[cat] || { attempted: 0, solved: 0, successRate: 0 };
      catData.attempted += 1;
      if (isCorrect) catData.solved += 1;
      catData.successRate = Math.round((catData.solved / catData.attempted) * 100);
      categoryPerf[cat] = catData;

      const newTotalAttempted = prog.totalPositionsAttempted + 1;
      const newTotalSolved = prog.totalPositionsSolved + (isCorrect ? 1 : 0);
      const newOverallRate = Math.round((newTotalSolved / newTotalAttempted) * 100);

      // Adaptive difficulty progression
      let newDiff = prog.currentDifficulty;
      if (newTotalAttempted >= 10) {
        if (newOverallRate > 85) newDiff = "EXPERT";
        else if (newOverallRate > 70) newDiff = "HARD";
        else if (newOverallRate > 45) newDiff = "INTERMEDIATE";
        else newDiff = "EASY";
      }

      await tx.trainingProgress.update({
        where: { userId },
        data: {
          totalPositionsAttempted: newTotalAttempted,
          totalPositionsSolved: newTotalSolved,
          overallSuccessRate: newOverallRate,
          categoryPerformance: categoryPerf,
          currentDifficulty: newDiff,
          lastTrainingDate: new Date(),
          totalSessionsCompleted: prog.totalSessionsCompleted + (isSessionFinished ? 1 : 0),
        },
      });

      return {
        attempt,
        sessionCompleted: isSessionFinished,
        sessionScore,
      };
    });

    return {
      attemptId: result.attempt.id,
      submittedMove: submittedSan,
      submittedMoveUci: submittedUci,
      isCorrect,
      quality,
      engineRank,
      cpLoss,
      targetMove,
      playerHistoricalMove: position.playerHistoricalMove,
      playerHistoricalClass: position.playerHistoricalClass,
      currentSelf: {
        move: csPred?.recommendedMove || null,
        confidence: csPred?.confidence || null,
      },
      peakSelf: {
        move: psPred?.recommendedMove || null,
        confidence: psPred?.confidence || null,
      },
      explanation,
      sessionStatus: result.sessionCompleted ? "COMPLETED" : "IN_PROGRESS",
      sessionScore: result.sessionScore,
    };
  }

  /**
   * Complete session and update final stats
   */
  static async completeSession(userId, sessionId) {
    const session = await prisma.trainingSession.findFirst({
      where: { id: sessionId, userId },
      include: { attempts: true },
    });

    if (!session) {
      throw new Error("Training session not found or unauthorized.");
    }

    const correctCount = session.attempts.filter((a) => a.isCorrect).length;
    const finalScore = session.positionsPlanned > 0
      ? Math.round((correctCount / session.positionsPlanned) * 100)
      : 0;

    const updated = await prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        score: finalScore,
        completedAt: new Date(),
      },
    });

    return {
      session: updated,
      positionsCompleted: session.positionsCompleted,
      positionsPlanned: session.positionsPlanned,
      correctCount,
      score: finalScore,
    };
  }

  /**
   * Get user training progress
   */
  static async getProgress(userId) {
    let progress = await prisma.trainingProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      progress = await prisma.trainingProgress.create({
        data: { userId },
      });
    }

    const sessionHistory = await prisma.trainingSession.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        category: true,
        difficulty: true,
        score: true,
        completedAt: true,
      },
    });

    return {
      progress: {
        totalSessionsCompleted: progress.totalSessionsCompleted,
        totalPositionsAttempted: progress.totalPositionsAttempted,
        totalPositionsSolved: progress.totalPositionsSolved,
        overallSuccessRate: progress.overallSuccessRate,
        categoryPerformance: progress.categoryPerformance,
        weaknessProgression: progress.weaknessProgression,
        currentDifficulty: progress.currentDifficulty,
        streakDays: progress.streakDays,
        lastTrainingDate: progress.lastTrainingDate,
      },
      sessionHistory,
    };
  }

  /**
   * Get user's recurring weaknesses backed by real analyzed games
   */
  static async getWeaknesses(userId) {
    const profile = await TrainingService.resolveUserProfile(userId);

    if (!profile) {
      return { weaknesses: [] };
    }

    const dna = await prisma.chessDNA.findUnique({
      where: { userId },
      select: { topWeaknesses: true },
    });

    // Evidence counts per category from PositionAnalysis
    const breakdown = await prisma.$queryRaw`
      SELECT 
        pa.classification as "classification",
        pa."gamePhase"::text as "gamePhase",
        COUNT(*)::int as "count",
        ROUND(AVG(pa."cpLoss")::numeric, 1)::float as "avgCpLoss"
      FROM "PositionAnalysis" pa
      JOIN "Game" g ON g.id = pa."gameId"
      WHERE g."chessProfileId" = ${profile.id}
        AND pa."playerMove" = true
        AND pa.classification IN ('BLUNDER', 'MISTAKE', 'INACCURACY')
      GROUP BY pa.classification, pa."gamePhase"
    `;

    return {
      topWeaknesses: dna?.topWeaknesses || [],
      errorEvidence: breakdown,
    };
  }
}
