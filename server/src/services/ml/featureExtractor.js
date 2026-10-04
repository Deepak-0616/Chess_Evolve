import { Chess } from "chess.js";

export class FeatureExtractor {
  /**
   * Extract position-level features from FEN string
   */
  static extractPositionFeatures(fen, currentEval = 0) {
    const chess = new Chess(fen);
    const board = chess.board();

    let whiteMaterial = 0;
    let blackMaterial = 0;
    let whitePawns = 0, blackPawns = 0;
    let whiteKnights = 0, blackKnights = 0;
    let whiteBishops = 0, blackBishops = 0;
    let whiteRooks = 0, blackRooks = 0;
    let whiteQueens = 0, blackQueens = 0;

    const values = { p: 1, n: 3, b: 3.25, r: 5, q: 9, k: 0 };

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;
        const val = values[piece.type] || 0;
        if (piece.color === "w") {
          whiteMaterial += val;
          if (piece.type === "p") whitePawns++;
          if (piece.type === "n") whiteKnights++;
          if (piece.type === "b") whiteBishops++;
          if (piece.type === "r") whiteRooks++;
          if (piece.type === "q") whiteQueens++;
        } else {
          blackMaterial += val;
          if (piece.type === "p") blackPawns++;
          if (piece.type === "n") blackKnights++;
          if (piece.type === "b") blackBishops++;
          if (piece.type === "r") blackRooks++;
          if (piece.type === "q") blackQueens++;
        }
      }
    }

    const turn = chess.turn();
    const isWhite = turn === "w";
    const materialBalance = whiteMaterial - blackMaterial;
    const materialDiff = isWhite ? materialBalance : -materialBalance;

    const totalPieces = whitePawns + blackPawns + whiteKnights + blackKnights + whiteBishops + blackBishops + whiteRooks + blackRooks + whiteQueens + blackQueens;
    let gamePhase = "opening";
    if (totalPieces < 12) gamePhase = "endgame";
    else if (totalPieces < 24 || whiteQueens === 0 || blackQueens === 0) gamePhase = "middlegame";

    const legalMoves = chess.moves();
    const inCheck = chess.inCheck() ? 1 : 0;

    return {
      materialBalance,
      materialDiff,
      totalPieces,
      gamePhase,
      isWhite: isWhite ? 1 : 0,
      inCheck,
      legalMoveCount: legalMoves.length,
      stockfishEval: currentEval,
    };
  }

  /**
   * Extract features for a candidate move in a given position
   */
  static extractCandidateFeatures(chess, moveObj, stockfishEval = 0, topEval = 0, rank = 0, dna = {}) {
    const isCapture = moveObj.captured ? 1 : 0;
    const isCheck = moveObj.san.includes("+") || moveObj.san.includes("#") ? 1 : 0;
    const isPawnMove = moveObj.piece === "p" ? 1 : 0;
    const isPieceMove = moveObj.piece !== "p" ? 1 : 0;
    const isQueenMove = moveObj.piece === "q" ? 1 : 0;
    const isKingMove = moveObj.piece === "k" ? 1 : 0;
    const isSacrifice = (isCapture && moveObj.captured === "p" && (moveObj.piece === "r" || moveObj.piece === "q" || moveObj.piece === "n" || moveObj.piece === "b")) ? 1 : 0;

    const evalDiff = topEval - stockfishEval;
    const centipawnLoss = Math.max(0, evalDiff);

    const isTactical = (isCapture || isCheck || isSacrifice) ? 1 : 0;
    const isSimplification = (isCapture && moveObj.piece === moveObj.captured) ? 1 : 0;

    return {
      san: moveObj.san,
      uci: `${moveObj.from}${moveObj.to}${moveObj.promotion || ""}`,
      stockfishEval,
      stockfishRank: rank,
      evalDiff,
      centipawnLoss,
      isCapture,
      isCheck,
      isSacrifice,
      isPawnMove,
      isPieceMove,
      isQueenMove,
      isKingMove,
      isTactical,
      isSimplification,
      // DNA behavior features
      aggressionDna: dna.aggression || 50,
      riskTakingDna: dna.riskTaking || 50,
      tacticalDna: dna.tacticalPreference || 50,
      positionalDna: dna.positionalPreference || 50,
      defensiveDna: dna.defensiveAbility || 50,
      endgameDna: dna.endgameAbility || 50,
      sacrificeDna: dna.sacrificeTendency || 50,
    };
  }
}
