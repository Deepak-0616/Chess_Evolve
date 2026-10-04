import { Chess } from 'chess.js';

export interface CandidateMoveEval {
  move: string;
  eval: number; // Centipawns (+100 = 1 pawn advantage)
  mateIn?: number;
}

export interface PositionEvaluationResult {
  fen: string;
  evalBefore: number;
  evalAfter: number;
  cpLoss: number;
  bestMove: string;
  candidateMoves: CandidateMoveEval[];
  classification: 'BEST' | 'GOOD' | 'INACCURACY' | 'MISTAKE' | 'BLUNDER';
  gamePhase: 'OPENING' | 'MIDDLEGAME' | 'ENDGAME';
  materialBalance: number;
  kingSafetyScore: number;
  tacticalScore: number;
  positionalScore: number;
}

export class ChessEngineService {
  /**
   * Evaluates a chess position and a player's move.
   */
  public static async evaluatePosition(
    fenBefore: string,
    playedMoveSan: string,
    fenAfter: string,
    isWhite: boolean
  ): Promise<PositionEvaluationResult> {
    const chess = new Chess(fenBefore);
    const legalMoves = chess.moves({ verbose: true });

    // Calculate material balance
    const board = chess.board();
    let whiteMaterial = 0;
    let blackMaterial = 0;
    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

    for (const row of board) {
      for (const square of row) {
        if (square) {
          const val = pieceValues[square.type] || 0;
          if (square.color === 'w') whiteMaterial += val;
          else blackMaterial += val;
        }
      }
    }

    const materialBalance = isWhite ? whiteMaterial - blackMaterial : blackMaterial - whiteMaterial;
    const totalMaterial = whiteMaterial + blackMaterial;

    // Game phase determination
    let gamePhase: 'OPENING' | 'MIDDLEGAME' | 'ENDGAME' = 'MIDDLEGAME';
    if (totalMaterial >= 34 && chess.history().length < 24) {
      gamePhase = 'OPENING';
    } else if (totalMaterial <= 20 || (whiteMaterial <= 13 && blackMaterial <= 13)) {
      gamePhase = 'ENDGAME';
    }

    // Candidate moves generation and evaluation
    const candidates: CandidateMoveEval[] = legalMoves.map((m, idx) => {
      // Basic position heuristic eval for each legal move
      let score = (legalMoves.length - idx) * 0.1;
      if (m.captured) score += pieceValues[m.captured] * 1.0;
      if (m.san === playedMoveSan) score += 0.2;
      return {
        move: m.san,
        eval: score * 100 * (chess.turn() === 'w' ? 1 : -1),
      };
    }).sort((a, b) => (chess.turn() === 'w' ? b.eval - a.eval : a.eval - b.eval));

    const bestMove = candidates[0]?.move || playedMoveSan;
    const bestEval = candidates[0]?.eval || 0;

    // Compare played move with best candidate
    const playedCandidate = candidates.find(c => c.move === playedMoveSan);
    const playedEval = playedCandidate ? playedCandidate.eval : bestEval - 150;

    // Centipawn loss (CP Loss)
    const rawCpLoss = Math.abs(bestEval - playedEval);
    const cpLoss = Math.min(Math.max(rawCpLoss, 0), 1000);

    // Classification threshold
    let classification: 'BEST' | 'GOOD' | 'INACCURACY' | 'MISTAKE' | 'BLUNDER' = 'BEST';
    if (playedMoveSan === bestMove || cpLoss <= 15) {
      classification = 'BEST';
    } else if (cpLoss <= 45) {
      classification = 'GOOD';
    } else if (cpLoss <= 110) {
      classification = 'INACCURACY';
    } else if (cpLoss <= 250) {
      classification = 'MISTAKE';
    } else {
      classification = 'BLUNDER';
    }

    // Positional / Tactical / King safety heuristics
    const kingSafetyScore = Math.max(0, 100 - cpLoss * 0.2);
    const tacticalScore = Math.min(100, (candidates.length > 0 ? 50 + cpLoss * 0.1 : 50));
    const positionalScore = Math.max(0, 100 - (cpLoss > 50 ? cpLoss * 0.5 : cpLoss * 0.1));

    return {
      fen: fenBefore,
      evalBefore: bestEval,
      evalAfter: playedEval,
      cpLoss,
      bestMove,
      candidateMoves: candidates.slice(0, 5),
      classification,
      gamePhase,
      materialBalance,
      kingSafetyScore,
      tacticalScore,
      positionalScore,
    };
  }
}
