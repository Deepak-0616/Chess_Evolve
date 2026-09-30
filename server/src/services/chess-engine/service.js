import { Chess } from "chess.js";
import { spawn } from "child_process";
import fs from "fs";

const STOCKFISH_PATH = "C:\\Program Files\\stockfish\\STOCKFISH.exe";

class StockfishEngineProcess {
  constructor(executablePath) {
    this.path = executablePath;
    this.process = null;
    this.available = false;
    this.queue = [];
    this.isProcessing = false;
    this.init();
  }

  init() {
    if (!fs.existsSync(this.path)) {
      this.available = false;
      return;
    }
    try {
      this.process = spawn(this.path);
      this.available = true;
      this.process.stdin.write("uci\nisready\n");

      this.process.on("error", (err) => {
        console.warn("Stockfish engine error:", err?.message || err);
        this.available = false;
      });

      this.process.on("exit", () => {
        this.available = false;
        this.process = null;
      });
    } catch (e) {
      console.warn("Failed to spawn Stockfish binary:", e);
      this.available = false;
    }
  }

  async evaluate(fen, depth = 12, timeoutMs = 2500) {
    if (!this.available) {
      if (fs.existsSync(this.path) && !this.process) {
        this.init();
      }
      if (!this.available) return null;
    }

    return new Promise((resolve) => {
      this.queue.push({ fen, depth, timeoutMs, resolve });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const { fen, depth, timeoutMs, resolve } = this.queue.shift();

    if (!this.process || !this.available) {
      this.isProcessing = false;
      resolve(null);
      this.processQueue();
      return;
    }

    let stdoutData = "";
    let cp = 0;
    let mate = null;
    let bestMove = "";
    let timer = null;

    const onData = (data) => {
      stdoutData += data.toString();
      const lines = stdoutData.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("info ") && trimmed.includes(" score ")) {
          const matchCp = trimmed.match(/score cp (-?\d+)/);
          const matchMate = trimmed.match(/score mate (-?\d+)/);
          if (matchCp) {
            cp = parseInt(matchCp[1], 10);
            mate = null;
          } else if (matchMate) {
            mate = parseInt(matchMate[1], 10);
          }
        }
        if (trimmed.startsWith("bestmove ")) {
          bestMove = trimmed.split(" ")[1]?.trim() || "";
          finish({ cp, mate, bestMove });
          return;
        }
      }
    };

    const finish = (result) => {
      if (timer) clearTimeout(timer);
      if (this.process && this.process.stdout) {
        this.process.stdout.removeListener("data", onData);
      }
      this.isProcessing = false;
      resolve(result);
      setImmediate(() => this.processQueue());
    };

    timer = setTimeout(() => {
      finish(null);
    }, timeoutMs);

    this.process.stdout.on("data", onData);
    this.process.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);
  }
}

const globalStockfishPool = new StockfishEngineProcess(STOCKFISH_PATH);

export class ChessEngineService {
  /**
   * Convert centipawn evaluation into win percentage (0 to 100).
   */
  static winChance(evalCp) {
    return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * evalCp)) - 1);
  }

  /**
   * Async position evaluation using native Stockfish 19 NNUE binary if available,
   * falling back to rule-based evaluation.
   */
  static async evaluatePositionAsync(fen, depth = 12) {
    const chess = new Chess(fen);
    if (chess.isCheckmate()) {
      const turn = chess.turn();
      return {
        score: turn === "w" ? -10000 : 10000,
        bestMove: "",
        depth: 18,
        engine: "Checkmate",
      };
    }
    if (chess.isDraw() || chess.isStalemate()) {
      return { score: 0, bestMove: "", depth: 18, engine: "Draw" };
    }

    const sfRes = await globalStockfishPool.evaluate(fen, depth);
    if (sfRes) {
      const turn = chess.turn();
      let whiteScore = 0;
      if (sfRes.mate !== null) {
        if (turn === "w") {
          whiteScore = sfRes.mate > 0 ? 10000 - sfRes.mate * 10 : -10000 - sfRes.mate * 10;
        } else {
          whiteScore = sfRes.mate > 0 ? -10000 + sfRes.mate * 10 : 10000 + sfRes.mate * 10;
        }
      } else {
        whiteScore = turn === "w" ? sfRes.cp : -sfRes.cp;
      }

      let bestMoveSan = sfRes.bestMove;
      if (sfRes.bestMove && sfRes.bestMove.length >= 4) {
        try {
          const from = sfRes.bestMove.slice(0, 2);
          const to = sfRes.bestMove.slice(2, 4);
          const promotion = sfRes.bestMove.length > 4 ? sfRes.bestMove[4] : undefined;
          const m = chess.move({ from, to, promotion });
          if (m) bestMoveSan = m.san;
        } catch (e) {
          // ignore move parsing errors
        }
      }

      return {
        score: whiteScore,
        bestMove: bestMoveSan,
        depth,
        engine: "Stockfish 19 NNUE",
      };
    }

    return this.evaluatePosition(fen);
  }

  /**
   * Static rule-based & tactical position evaluator for fast & deterministic fallback.
   */
  static evaluatePosition(fen) {
    const chess = new Chess(fen);
    if (chess.isCheckmate()) {
      const turn = chess.turn();
      return {
        score: turn === "w" ? -10000 : 10000,
        bestMove: "",
        depth: 18,
      };
    }
    if (chess.isDraw() || chess.isStalemate()) {
      return { score: 0, bestMove: "", depth: 18 };
    }

    const board = chess.board();
    const pieceValues = {
      p: 100,
      n: 320,
      b: 330,
      r: 500,
      q: 900,
      k: 20000,
    };

    const centerSquares = ["d4", "d5", "e4", "e5"];
    const extendedCenter = ["c3", "c4", "c5", "c6", "d3", "d6", "e3", "e6", "f3", "f4", "f5", "f6"];

    let whiteScore = 0;
    let blackScore = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const val = pieceValues[piece.type] || 0;
        const squareName = `${String.fromCharCode(97 + c)}${8 - r}`;

        let posBonus = 0;
        if (centerSquares.includes(squareName)) posBonus += 30;
        else if (extendedCenter.includes(squareName)) posBonus += 10;

        if (piece.type === "p") {
          const rankBonus = piece.color === "w" ? (7 - r) * 10 : r * 10;
          posBonus += rankBonus;
        }

        if (piece.color === "w") {
          whiteScore += val + posBonus;
        } else {
          blackScore += val + posBonus;
        }
      }
    }

    if (chess.inCheck()) {
      if (chess.turn() === "w") whiteScore -= 50;
      else blackScore -= 50;
    }

    const evalCp = whiteScore - blackScore;

    const moves = chess.moves({ verbose: true });
    let bestMoveSan = moves.length > 0 ? moves[0].san : "";
    let bestScore = chess.turn() === "w" ? -Infinity : Infinity;

    for (const m of moves) {
      const tempChess = new Chess(fen);
      tempChess.move(m);
      const subEval = this.quickMaterialScore(tempChess);
      if (chess.turn() === "w") {
        if (subEval > bestScore) {
          bestScore = subEval;
          bestMoveSan = m.san;
        }
      } else {
        if (subEval < bestScore) {
          bestScore = subEval;
          bestMoveSan = m.san;
        }
      }
    }

    return {
      score: evalCp,
      bestMove: bestMoveSan,
      depth: 14,
    };
  }

  static quickMaterialScore(chess) {
    if (chess.isCheckmate()) return chess.turn() === "w" ? -99999 : 99999;
    if (chess.isDraw()) return 0;
    const board = chess.board();
    const vals = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          const v = vals[piece.type];
          score += piece.color === "w" ? v : -v;
        }
      }
    }
    return score;
  }

  /**
   * Analyze complete game move sequence and produce accuracy metrics & critical moments.
   */
  static async analyzeGame(pgn, playerColor, preCalculatedAccuracy = null) {
    const chess = new Chess();
    try {
      chess.loadPgn(pgn, { strict: false });
    } catch (e) {
      chess.loadPgn(pgn);
    }
    const history = chess.history({ verbose: true });

    let blunders = 0;
    let mistakes = 0;
    let inaccuracies = 0;
    let excellentMoves = 0;

    const criticalMoments = [];
    const moveEvaluations = [];

    const replay = new Chess();
    let playerLossSum = 0;
    let playerMoveCount = 0;

    let opponentLossSum = 0;
    let opponentMoveCount = 0;

    const initialEvalObj = await this.evaluatePositionAsync(replay.fen(), 10);
    let prevEval = initialEvalObj.score;

    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      const moveColor = move.color === "w" ? "WHITE" : "BLACK";
      const isPlayerMove = moveColor === playerColor;

      const fenBefore = replay.fen();
      replay.move(move);
      const fenAfter = replay.fen();

      const currEvalObj = await this.evaluatePositionAsync(fenAfter, 10);
      const currEval = currEvalObj.score;

      let evalLoss = 0;
      if (moveColor === "WHITE") {
        evalLoss = Math.max(0, (prevEval - currEval) / 100);
      } else {
        evalLoss = Math.max(0, (currEval - prevEval) / 100);
      }

      let severity = "EXCELLENT";
      if (evalLoss >= 2.0) {
        severity = "BLUNDER";
        if (isPlayerMove) blunders++;
      } else if (evalLoss >= 0.9) {
        severity = "MISTAKE";
        if (isPlayerMove) mistakes++;
      } else if (evalLoss >= 0.4) {
        severity = "INACCURACY";
        if (isPlayerMove) inaccuracies++;
      } else {
        severity = "EXCELLENT";
        if (isPlayerMove) excellentMoves++;
      }

      const winBefore = this.winChance(prevEval);
      const winAfter = this.winChance(currEval);
      const winDrop = moveColor === "WHITE" ? Math.max(0, winBefore - winAfter) : Math.max(0, winAfter - winBefore);

      if (isPlayerMove) {
        playerLossSum += winDrop;
        playerMoveCount++;
      } else {
        opponentLossSum += winDrop;
        opponentMoveCount++;
      }

      const bestMoveObj = await this.evaluatePositionAsync(fenBefore, 10);

      if (severity === "BLUNDER" || severity === "MISTAKE" || (isPlayerMove && evalLoss > 1.2)) {
        criticalMoments.push({
          moveNumber: Math.floor(i / 2) + 1,
          ply: i + 1,
          fen: fenBefore,
          playedMove: move.san,
          bestMove: bestMoveObj.bestMove || move.san,
          evaluationBefore: Number((prevEval / 100).toFixed(1)),
          evaluationAfter: Number((currEval / 100).toFixed(1)),
          evaluationLoss: Number(evalLoss.toFixed(1)),
          severity,
          comment: isPlayerMove
            ? severity === "BLUNDER"
              ? "Critical tactical blunder changing position balance."
              : "Suboptimal move missing stronger candidate continuation."
            : "Opponent left tactical opportunity on the board.",
        });
      }

      moveEvaluations.push({
        ply: i + 1,
        moveNumber: Math.floor(i / 2) + 1,
        san: move.san,
        fen: fenAfter,
        evalBefore: Number((prevEval / 100).toFixed(1)),
        evalAfter: Number((currEval / 100).toFixed(1)),
        evalLoss: Number(evalLoss.toFixed(1)),
        severity,
        isPlayerMove,
      });

      prevEval = currEval;
    }

    let playerAccuracy = preCalculatedAccuracy;
    let opponentAccuracy;

    if (!playerAccuracy || isNaN(playerAccuracy)) {
      const playerAvgLoss = playerMoveCount > 0 ? playerLossSum / playerMoveCount : 5;
      playerAccuracy = Number(Math.max(45, Math.min(98.5, 100 - playerAvgLoss * 3.5 - (blunders * 4.5 + mistakes * 2.0))).toFixed(1));
    }

    const opponentAvgLoss = opponentMoveCount > 0 ? opponentLossSum / opponentMoveCount : 5;
    opponentAccuracy = Number(Math.max(45, Math.min(98.5, 100 - opponentAvgLoss * 3.5)).toFixed(1));

    return {
      playerAccuracy,
      opponentAccuracy,
      blunders,
      mistakes,
      inaccuracies,
      excellentMoves,
      criticalMoments: criticalMoments.slice(0, 10),
      moveEvaluations,
    };
  }
}

