import { spawn } from "child_process";
import fs from "fs";

// Semaphore to limit concurrent Stockfish processes
class ProcessSemaphore {
  constructor(maxConcurrency = 4) {
    this.maxConcurrency = maxConcurrency;
    this.currentRunning = 0;
    this.waitingQueue = [];
  }

  async acquire() {
    if (this.currentRunning < this.maxConcurrency) {
      this.currentRunning++;
      return;
    }
    return new Promise((resolve) => {
      this.waitingQueue.push(resolve);
    });
  }

  release() {
    this.currentRunning--;
    if (this.waitingQueue.length > 0) {
      this.currentRunning++;
      const next = this.waitingQueue.shift();
      next();
    }
  }
}

const MAX_STOCKFISH_CONCURRENCY = parseInt(
  process.env.STOCKFISH_MAX_CONCURRENCY || "4",
  10
);
const stockfishSemaphore = new ProcessSemaphore(MAX_STOCKFISH_CONCURRENCY);

export class StockfishService {
  /**
   * Returns the configured Stockfish binary path or null if unconfigured.
   */
  static getBinaryPath() {
    return process.env.STOCKFISH_PATH || null;
  }

  /**
   * Verifies whether Stockfish executable is available and operational.
   */
  static async isAvailable() {
    const binPath = this.getBinaryPath();
    if (!binPath) return false;

    // Check if path exists if an absolute or relative file path is provided
    if (binPath.includes("/") || binPath.includes("\\")) {
      if (!fs.existsSync(binPath)) {
        return false;
      }
    }

    return new Promise((resolve) => {
      try {
        const proc = spawn(binPath);
        let responded = false;

        const timer = setTimeout(() => {
          if (!responded) {
            proc.kill();
            resolve(false);
          }
        }, 3000);

        proc.stdout.on("data", (data) => {
          if (data.toString().includes("Stockfish") || data.toString().includes("id name")) {
            responded = true;
            clearTimeout(timer);
            proc.kill();
            resolve(true);
          }
        });

        proc.on("error", () => {
          clearTimeout(timer);
          resolve(false);
        });

        proc.stdin.write("uci\n");
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Validates FEN string before passing to engine
   */
  static isValidFen(fen) {
    if (!fen || typeof fen !== "string") return false;
    const parts = fen.trim().split(" ");
    return parts.length >= 2 && parts.length <= 6 && fen.length <= 150;
  }

  /**
   * Evaluates a position with bounded concurrency, strict timeout, and crash cleanup.
   */
  static async evaluatePosition(fen, depth = 10, timeoutMs = 5000) {
    let d = depth;
    let t = timeoutMs;
    if (typeof depth === "object" && depth !== null) {
      d = depth.depth ?? 10;
      t = depth.timeoutMs ?? 5000;
    }

    const binPath = this.getBinaryPath();
    if (!binPath || !this.isValidFen(fen)) {
      return { bestMove: null, eval: 0, fen };
    }

    const safeDepth = Math.min(Math.max(1, typeof d === "number" ? d : 10), 15);
    await stockfishSemaphore.acquire();

    return new Promise((resolve) => {
      let proc = null;
      let isDone = false;
      let currentBestMove = null;
      let currentEval = 0;

      const cleanup = () => {
        if (!isDone) {
          isDone = true;
          if (proc) {
            try {
              proc.kill("SIGKILL");
            } catch {}
          }
          stockfishSemaphore.release();
        }
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve({ bestMove: currentBestMove, eval: currentEval, fen, timedOut: true });
      }, typeof t === "number" ? t : 5000);

      try {
        proc = spawn(binPath);

        proc.on("error", (err) => {
          clearTimeout(timer);
          cleanup();
          resolve({ bestMove: null, eval: 0, fen, error: err.message });
        });

        proc.stdout.on("data", (data) => {
          const lines = data.toString().split("\n");
          for (const line of lines) {
            if (line.includes("score cp ")) {
              const match = line.match(/score cp (-?\d+)/);
              if (match) currentEval = parseInt(match[1], 10);
            } else if (line.includes("score mate ")) {
              const match = line.match(/score mate (-?\d+)/);
              if (match) {
                const mateIn = parseInt(match[1], 10);
                currentEval = mateIn > 0 ? 10000 - mateIn * 10 : -10000 - mateIn * 10;
              }
            }

            if (line.startsWith("bestmove")) {
              const parts = line.split(" ");
              currentBestMove = parts[1]?.trim();
              clearTimeout(timer);
              cleanup();
              resolve({ bestMove: currentBestMove, eval: currentEval, fen });
              break;
            }
          }
        });

        proc.stdin.write("uci\n");
        proc.stdin.write(`position fen ${fen}\n`);
        proc.stdin.write(`go depth ${safeDepth}\n`);
      } catch (err) {
        clearTimeout(timer);
        cleanup();
        resolve({ bestMove: null, eval: 0, fen, error: err.message });
      }
    });
  }

  /**
   * Evaluates top K candidate moves with bounded concurrency, MultiPV limit, and timeout.
   */
  static async getCandidates(fen, depth = 10, multiPv = 5, timeoutMs = 5000) {
    let d = depth;
    let m = multiPv;
    let t = timeoutMs;
    if (typeof depth === "object" && depth !== null) {
      d = depth.depth ?? 10;
      m = depth.multiPv ?? 5;
      t = depth.timeoutMs ?? 5000;
    }

    const binPath = this.getBinaryPath();
    if (!binPath || !this.isValidFen(fen)) {
      return [];
    }

    const safeDepth = Math.min(Math.max(1, typeof d === "number" ? d : 10), 15);
    const safeMultiPv = Math.min(Math.max(1, typeof m === "number" ? m : 5), 5);

    await stockfishSemaphore.acquire();

    return new Promise((resolve) => {
      let proc = null;
      let isDone = false;
      const candidates = [];

      const cleanup = () => {
        if (!isDone) {
          isDone = true;
          if (proc) {
            try {
              proc.kill("SIGKILL");
            } catch {}
          }
          stockfishSemaphore.release();
        }
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve(candidates.filter(Boolean));
      }, timeoutMs);

      try {
        proc = spawn(binPath);

        proc.on("error", () => {
          clearTimeout(timer);
          cleanup();
          resolve([]);
        });

        proc.stdout.on("data", (data) => {
          if (isDone) return;
          const lines = data.toString().split("\n");
          for (const line of lines) {
            if (line.includes("multipv") && line.includes(" score ")) {
              const moveMatch = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
              const cpMatch = line.match(/score cp (-?\d+)/);
              const mateMatch = line.match(/score mate (-?\d+)/);
              const pvMatch = line.match(/multipv (\d+)/);

              if (moveMatch && pvMatch) {
                const move = moveMatch[1];
                const rank = parseInt(pvMatch[1], 10);
                let score = 0;
                if (cpMatch) {
                  score = parseInt(cpMatch[1], 10) / 100.0;
                } else if (mateMatch) {
                  const m = parseInt(mateMatch[1], 10);
                  score = m > 0 ? 100.0 - m : -100.0 - m;
                }
                candidates[rank - 1] = { move, score, rank };
              }
            } else if (line.startsWith("bestmove")) {
              clearTimeout(timer);
              cleanup();
              resolve(candidates.filter(Boolean));
              break;
            }
          }
        });

        proc.stdin.write(`setoption name MultiPV value ${safeMultiPv}\n`);
        proc.stdin.write(`position fen ${fen}\n`);
        proc.stdin.write(`go depth ${safeDepth}\n`);
      } catch {
        clearTimeout(timer);
        cleanup();
        resolve([]);
      }
    });
  }
}
