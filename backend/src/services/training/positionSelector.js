import { Chess } from "chess.js";
import { prisma } from "../../utils/prisma.js";
import { StockfishService } from "../stockfish/StockfishService.js";

/**
 * Quality filter and position selector for personalized chess training.
 * Extracts real training opportunities from the user's analyzed games.
 */
export class PositionSelector {
  /**
   * Weights for priority scoring
   */
  static WEIGHTS = {
    severity: 0.35,
    recurrence: 0.25,
    recency: 0.15,
    errorGap: 0.15,
    priorExposure: 0.10,
  };

  /**
   * Categorize a position analysis based on its chess metrics
   */
  static categorizePosition(pa) {
    if (pa.gamePhase === "ENDGAME") {
      return "ENDGAME";
    }
    if (pa.gamePhase === "OPENING") {
      return "OPENING";
    }
    if (pa.kingSafetyScore < -0.2 || (pa.classification === "BLUNDER" && pa.cpLoss >= 150)) {
      return "DEFENSIVE";
    }
    if (pa.tacticalScore > 0.35 || pa.classification === "BLUNDER") {
      return "TACTICAL";
    }
    return "POSITIONAL";
  }

  /**
   * Determine position difficulty based on engine score gap and complexity
   */
  static determineDifficulty(cpLoss, candidates = []) {
    if (cpLoss >= 250) return "EASY";      // Obvious tactical mistake, clearer solution
    if (cpLoss >= 120) return "MEDIUM";    // Standard tactical/defensive opportunity
    if (cpLoss >= 60) return "HARD";       // Subtle mistake requiring calculation
    return "EXPERT";                       // Nuanced positional decision
  }

  /**
   * Calculate data-driven priority score for a position
   */
  static calculatePriority({ cpLoss, recurrenceCount, playedAt, maxDate, minDate, candidateCount, priorAttempts = 0 }) {
    // 1. Severity: normalized CP loss (capped at 400 cp = 1.0)
    const severityScore = Math.min((cpLoss || 0) / 400.0, 1.0);

    // 2. Recurrence: how often similar mistakes happen (capped at 10 = 1.0)
    const recurrenceScore = Math.min(recurrenceCount / 10.0, 1.0);

    // 3. Recency: games played more recently have higher recency score
    let recencyScore = 0.5;
    if (maxDate && minDate && maxDate > minDate && playedAt) {
      recencyScore = (new Date(playedAt) - minDate) / (maxDate - minDate);
      recencyScore = Math.max(0, Math.min(recencyScore, 1.0));
    }

    // 4. Error Gap: availability of distinct candidates
    const errorGapScore = Math.min((candidateCount || 2) / 5.0, 1.0);

    // 5. Prior exposure penalty (spaced repetition decay)
    const exposurePenalty = Math.min((priorAttempts * 0.25), 1.0);

    const w = PositionSelector.WEIGHTS;
    const finalScore =
      w.severity * severityScore +
      w.recurrence * recurrenceScore +
      w.recency * recencyScore +
      w.errorGap * errorGapScore -
      w.priorExposure * exposurePenalty;

    return Math.max(0, Math.round(finalScore * 100) / 100);
  }

  /**
   * Select a set of personalized training positions for a user
   */
  static async selectPositionsForUser(userId, {
    category = null,
    limit = 5,
    targetDifficulty = null,
    planId = null
  } = {}) {
    let profile = await prisma.chessProfile.findUnique({
      where: { userId },
      select: { id: true, chessUsername: true }
    });

    if (!profile) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (user?.email) {
        profile = await prisma.chessProfile.findFirst({
          where: { user: { email: user.email } },
          select: { id: true, chessUsername: true },
          orderBy: { updatedAt: "desc" }
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

    if (!profile) {
      return { positions: [], exclusions: [{ reason: "NO_CHESS_PROFILE" }] };
    }

    // 2. Fetch user's previous attempt history to avoid overexposure
    const priorAttempts = await prisma.trainingAttempt.findMany({
      where: { userId },
      select: { trainingPositionId: true },
    });
    const attemptCounts = {};
    for (const a of priorAttempts) {
      attemptCounts[a.trainingPositionId] = (attemptCounts[a.trainingPositionId] || 0) + 1;
    }

    // 3. Fetch candidate PositionAnalyses from user's games where user made a mistake/blunder
    const rawPositions = await prisma.positionAnalysis.findMany({
      where: {
        playerMove: true,
        classification: { in: ["BLUNDER", "MISTAKE", "INACCURACY"] },
        game: {
          chessProfileId: profile.id
        }
      },
      include: {
        game: {
          select: {
            id: true,
            userColor: true,
            playedAt: true,
            whiteUsername: true,
            blackUsername: true
          }
        }
      },
      orderBy: { cpLoss: "desc" },
      take: 200
    });

    if (rawPositions.length === 0) {
      return { positions: [], exclusions: [{ reason: "NO_ANALYZED_POSITIONS_WITH_MISTAKES" }] };
    }

    // Min and max dates for recency scoring
    const dates = rawPositions.map(p => new Date(p.game.playedAt)).filter(d => !isNaN(d));
    const minDate = dates.length ? new Date(Math.min(...dates)) : new Date();
    const maxDate = dates.length ? new Date(Math.max(...dates)) : new Date();

    const seenFens = new Set();
    const evaluatedCandidates = [];
    const exclusions = [];

    // Count mistakes per category for recurrence scoring
    const categoryCounts = {};
    for (const p of rawPositions) {
      const cat = PositionSelector.categorizePosition(p);
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    for (const p of rawPositions) {
      // Quality Check 1: Valid FEN & valid chess position
      let chess;
      try {
        chess = new Chess(p.fen);
      } catch (err) {
        exclusions.push({ positionId: p.id, reason: "MALFORMED_FEN" });
        continue;
      }

      if (chess.isGameOver()) {
        exclusions.push({ positionId: p.id, reason: "GAME_ALREADY_OVER" });
        continue;
      }

      // Quality Check 2: Side to move matches user color
      const sideToMove = chess.turn() === "w" ? "WHITE" : "BLACK";
      if (p.game.userColor && sideToMove !== p.game.userColor.toUpperCase()) {
        exclusions.push({ positionId: p.id, reason: "SIDE_TO_MOVE_MISMATCH" });
        continue;
      }

      // Quality Check 3: Unique FEN (avoid duplicate positions)
      const fenKey = p.fen.split(" ").slice(0, 4).join(" ");
      if (seenFens.has(fenKey)) {
        exclusions.push({ positionId: p.id, reason: "DUPLICATE_POSITION" });
        continue;
      }
      seenFens.add(fenKey);

      // Quality Check 4: Meaningful best move and candidates
      if (!p.bestMove) {
        exclusions.push({ positionId: p.id, reason: "INSUFFICIENT_ENGINE_ANALYSIS" });
        continue;
      }

      // Categorization
      const posCategory = PositionSelector.categorizePosition(p);
      if (category && posCategory.toUpperCase() !== category.toUpperCase()) {
        continue; // filtered by requested category
      }

      // Candidate moves format normalization
      let candidates = Array.isArray(p.candidateMoves) ? p.candidateMoves : [];
      if (candidates.length === 0) {
        // Fallback to bestMove as rank 1 and player move as rank 2 if available
        candidates = [
          { move: p.bestMove, rank: 1, score: (p.evalAfter || 0) / 100.0 },
          { move: p.move, rank: 2, score: ((p.evalAfter || 0) - p.cpLoss) / 100.0 }
        ];
      }

      const diff = PositionSelector.determineDifficulty(p.cpLoss, candidates);
      if (targetDifficulty && diff !== targetDifficulty.toUpperCase()) {
        continue;
      }

      // Calculate priority
      const recurrence = categoryCounts[posCategory] || 1;
      const priorCount = attemptCounts[p.id] || 0;
      const priority = PositionSelector.calculatePriority({
        cpLoss: p.cpLoss,
        recurrenceCount: recurrence,
        playedAt: p.game.playedAt,
        maxDate,
        minDate,
        candidateCount: candidates.length,
        priorAttempts: priorCount
      });

      evaluatedCandidates.push({
        positionAnalysisId: p.id,
        gameId: p.game.id,
        moveNumber: p.moveNumber,
        fen: p.fen,
        sideToMove,
        weaknessCategory: posCategory,
        weaknessScore: Math.min(p.cpLoss / 100.0, 5.0),
        recurrenceScore: recurrence,
        priorityScore: priority,
        difficulty: diff,
        targetMove: p.bestMove,
        playerHistoricalMove: p.move,
        playerHistoricalClass: p.classification,
        playerHistoricalCpLoss: p.cpLoss,
        candidateMoves: candidates,
        metadata: {
          gamePhase: p.gamePhase,
          evalBefore: p.evalBefore,
          evalAfter: p.evalAfter,
          playedAt: p.game.playedAt,
          whiteUsername: p.game.whiteUsername,
          blackUsername: p.game.blackUsername
        }
      });
    }

    // Sort by priority descending
    evaluatedCandidates.sort((a, b) => b.priorityScore - a.priorityScore);

    const selected = evaluatedCandidates.slice(0, limit);

    return {
      positions: selected,
      totalEvaluated: evaluatedCandidates.length,
      exclusionsCount: exclusions.length,
      exclusions
    };
  }
}
