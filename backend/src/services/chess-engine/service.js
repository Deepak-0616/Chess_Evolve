import { Chess } from "chess.js";
import { StockfishService } from "../stockfish/StockfishService.js";

export class ChessEngineService {
  /**
   * Evaluates a chess position and a player's move using Stockfish.
   */
  static async evaluatePosition(fenBefore, playedMoveSan, fenAfter, isWhite) {
    const chess = new Chess(fenBefore);
    const legalMoves = chess.moves({ verbose: true });

    // Calculate material balance
    const board = chess.board();
    let whiteMaterial = 0;
    let blackMaterial = 0;
    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

    for (const row of board) {
      for (const square of row) {
        if (square) {
          const val = pieceValues[square.type] || 0;
          if (square.color === "w") whiteMaterial += val;
          else blackMaterial += val;
        }
      }
    }

    const materialBalance = isWhite
      ? whiteMaterial - blackMaterial
      : blackMaterial - whiteMaterial;
    const totalMaterial = whiteMaterial + blackMaterial;

    // Game phase determination
    let gamePhase = "MIDDLEGAME";
    if (totalMaterial >= 34 && chess.history().length < 24) {
      gamePhase = "OPENING";
    } else if (
      totalMaterial <= 20 ||
      (whiteMaterial <= 13 && blackMaterial <= 13)
    ) {
      gamePhase = "ENDGAME";
    }

    // Candidate moves generation and evaluation using actual Stockfish
    let bestMove = playedMoveSan;
    let bestEval = 0;
    let playedEval = 0;

    try {
      // Evaluate fenBefore to get the objectively best move and its evaluation
      const beforeRes = await StockfishService.evaluatePosition(fenBefore, 10);
      bestMove = beforeRes.bestMove || playedMoveSan;
      // UCI eval is relative to the player to move. 
      // If it's White's turn, positive means White is winning.
      bestEval = chess.turn() === "w" ? beforeRes.eval : -beforeRes.eval;

      // Evaluate fenAfter to get the evaluation after the player's move
      const afterRes = await StockfishService.evaluatePosition(fenAfter, 10);
      // fenAfter is the opponent's turn.
      // So if White played, it's Black's turn. A positive score for Black means White is losing.
      playedEval = chess.turn() === "w" ? -afterRes.eval : afterRes.eval;
    } catch (err) {
      console.error("Stockfish evaluation failed, falling back to 0:", err);
    }

    // Centipawn loss (CP Loss)
    const rawCpLoss = Math.abs(bestEval - playedEval);
    const cpLoss = Math.min(Math.max(rawCpLoss, 0), 1000);

    // Classification threshold
    let classification = "BEST";
    if (playedMoveSan === bestMove || cpLoss <= 15) {
      classification = "BEST";
    } else if (cpLoss <= 45) {
      classification = "GOOD";
    } else if (cpLoss <= 110) {
      classification = "INACCURACY";
    } else if (cpLoss <= 250) {
      classification = "MISTAKE";
    } else {
      classification = "BLUNDER";
    }

    // Positional / Tactical / King safety heuristics
    const kingSafetyScore = Math.max(0, 100 - cpLoss * 0.2);
    const tacticalScore = Math.min(
      100,
      50 + cpLoss * 0.1
    );
    const positionalScore = Math.max(
      0,
      100 - (cpLoss > 50 ? cpLoss * 0.5 : cpLoss * 0.1),
    );

    return {
      fen: fenBefore,
      evalBefore: bestEval,
      evalAfter: playedEval,
      cpLoss,
      bestMove,
      candidateMoves: [], // Kept empty or dummy if not fully computing MultiPV
      classification,
      gamePhase,
      materialBalance,
      kingSafetyScore,
      tacticalScore,
      positionalScore,
    };
  }
}
