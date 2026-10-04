import { Chess } from "chess.js";
import { PrismaClient } from "@prisma/client";
import { FeatureExtractor } from "./featureExtractor.js";
import { ChessEngineService } from "../chess-engine/service.js";
import { ChessDNAService } from "../dna/service.js";

const prisma = new PrismaClient();

export class DatasetGenerator {
  /**
   * Generate dataset for Current Self and Peak Self models from imported user games
   */
  static async generateDatasets(userId) {
    const games = await prisma.game.findMany({
      where: { userId },
      take: 40,
      orderBy: { playedAt: "desc" },
      include: { moves: true, analysis: true },
    });

    if (!games || games.length === 0) {
      return { status: "INSUFFICIENT_DATA", message: "No games found for dataset generation." };
    }

    const dna = await ChessDNAService.getCurrentDNA(userId);
    const dnaMetrics = dna.metrics || {};
    const weaknesses = dna.weaknesses || [];

    const currentSelfDataset = [];
    const peakSelfDataset = [];
    let totalPositionsProcessed = 0;

    for (const game of games) {
      const chess = new Chess();
      const playerColor = game.playerColor.toLowerCase(); // 'w' or 'b'
      const moves = game.moves.sort((a, b) => a.ply - b.ply);

      for (const m of moves) {
        const turn = chess.turn();
        const isUserTurn = turn === playerColor;

        if (isUserTurn) {
          const fen = chess.fen();
          const legalMoves = chess.moves({ verbose: true });

          if (legalMoves.length > 1) {
            const userSan = m.san;
            const userUci = m.uci;

            const posFeatures = FeatureExtractor.extractPositionFeatures(fen);

            // Generate candidate moves and evaluations
            const candidateEvaluations = await Promise.all(
              legalMoves.slice(0, 6).map(async (candMove) => {
                const tempBoard = new Chess(fen);
                tempBoard.move(candMove);
                const evalRes = await ChessEngineService.evaluatePositionAsync(tempBoard.fen());
                const rawScore = turn === "w" ? evalRes.score : -evalRes.score;
                return {
                  moveObj: candMove,
                  evalScore: rawScore,
                };
              })
            );

            // Sort candidates by Stockfish score descending
            candidateEvaluations.sort((a, b) => b.evalScore - a.evalScore);
            const topEval = candidateEvaluations[0]?.evalScore || 0;

            let foundUserMove = false;

            candidateEvaluations.forEach((item, rank) => {
              const uci = `${item.moveObj.from}${item.moveObj.to}${item.moveObj.promotion || ""}`;
              const isPlayedByUser = (uci === userUci || item.moveObj.san === userSan) ? 1 : 0;
              if (isPlayedByUser) foundUserMove = true;

              const candFeatures = FeatureExtractor.extractCandidateFeatures(
                chess,
                item.moveObj,
                item.evalScore,
                topEval,
                rank,
                dnaMetrics
              );

              // 1. Current Self Example (Positive = 1 if played, 0 if not)
              currentSelfDataset.push({
                fen,
                positionFeatures: posFeatures,
                candidateFeatures: candFeatures,
                target: isPlayedByUser,
              });

              // 2. Peak Self Example (Target = PeakScore)
              // PeakScore = EngineQuality + StyleCompatibility + WeaknessCorrection - UnwantedRisk
              const engineQuality = Math.max(0, 1.0 - candFeatures.evalDiff / 250);
              let styleCompatibility = 0.5;
              if (candFeatures.isCheck || candFeatures.isTactical) {
                styleCompatibility += (dnaMetrics.aggression / 100) * 0.3 + (dnaMetrics.tacticalPreference / 100) * 0.2;
              }
              if (candFeatures.isSimplification) {
                styleCompatibility += (dnaMetrics.positionalPreference / 100) * 0.3;
              }

              // Weakness correction: rewards moves that fix user's tactical/blunder weakness
              let weaknessCorrection = 0;
              const isUserBlunder = isPlayedByUser && candFeatures.evalDiff > 120;
              if (!isUserBlunder && rank === 0) {
                weaknessCorrection = 0.4;
              } else if (!isUserBlunder && candFeatures.evalDiff < 30) {
                weaknessCorrection = 0.25;
              }

              const peakScore = Math.min(1.0, Math.max(0.0, 0.5 * engineQuality + 0.3 * styleCompatibility + 0.2 * weaknessCorrection));

              peakSelfDataset.push({
                fen,
                positionFeatures: posFeatures,
                candidateFeatures: candFeatures,
                userBlunder: isUserBlunder ? 1 : 0,
                targetPeakScore: Number(peakScore.toFixed(4)),
              });
            });

            totalPositionsProcessed++;
          }
        }

        // Apply move to advance board state
        try {
          chess.move(m.san);
        } catch (e) {
          break;
        }
      }
    }

    if (totalPositionsProcessed < 15 || currentSelfDataset.length < 30) {
      return {
        status: "INSUFFICIENT_DATA",
        positionsProcessed: totalPositionsProcessed,
        message: "Your Current Self needs more imported games (at least 15 position decisions) to reliably train personalized models.",
      };
    }

    return {
      status: "READY",
      totalPositionsProcessed,
      currentSelfDataset,
      peakSelfDataset,
      dnaMetrics,
      weaknesses,
    };
  }
}
