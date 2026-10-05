import { spawn } from "child_process";

class StockfishEngine {
  constructor() {
    this.stockfishPath = process.env.STOCKFISH_PATH;
    if (!this.stockfishPath) {
      throw new Error("STOCKFISH_PATH is not set in the environment.");
    }
    this.process = spawn(this.stockfishPath);
    this.queue = [];
    this.isProcessing = false;
    this.currentResolver = null;
    this.currentBestMove = null;
    this.currentEval = 0;

    this.process.stdout.on("data", (data) => {
      const output = data.toString();
      const lines = output.split('\n');
      
      for (const line of lines) {
        if (line.includes("score cp ")) {
          const match = line.match(/score cp (-?\d+)/);
          if (match) this.currentEval = parseInt(match[1], 10);
        } else if (line.includes("score mate ")) {
          const match = line.match(/score mate (-?\d+)/);
          if (match) {
            const mateIn = parseInt(match[1], 10);
            this.currentEval = mateIn > 0 ? 10000 - mateIn * 10 : -10000 - mateIn * 10;
          }
        }

        if (line.startsWith("bestmove")) {
          const parts = line.split(" ");
          this.currentBestMove = parts[1]?.trim();
          
          if (this.currentResolver) {
            this.currentResolver({ bestMove: this.currentBestMove, eval: this.currentEval });
            this.currentResolver = null;
          }
          this.isProcessing = false;
          this._processQueue();
          break;
        }
      }
    });

    this.process.stderr.on("data", (data) => {
      console.error("Stockfish Error:", data.toString());
    });
  }

  evaluate(fen, depth = 10) {
    return new Promise((resolve) => {
      this.queue.push({ fen, depth, resolve });
      this._processQueue();
    });
  }

  _processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    const task = this.queue.shift();
    this.currentResolver = task.resolve;
    this.currentBestMove = null;
    this.currentEval = 0;

    this.process.stdin.write("uci\n");
    this.process.stdin.write(`position fen ${task.fen}\n`);
    this.process.stdin.write(`go depth ${task.depth}\n`);
  }

  kill() {
    if (this.process) {
      this.process.kill();
    }
  }
}

let engineInstance = null;

export class StockfishService {
  /**
   * Evaluates a position using a persistent Stockfish process.
   * Resolves with { bestMove, fen, eval }
   */
  static async evaluatePosition(fen, depth = 10) {
    if (!engineInstance) {
      engineInstance = new StockfishEngine();
    }
    const result = await engineInstance.evaluate(fen, depth);
    return { ...result, fen };
  }

  /**
   * Evaluates top K candidates
   */
  static async getCandidates(fen, depth = 10, multiPv = 5) {
    return new Promise((resolve) => {
      const stockfishPath = process.env.STOCKFISH_PATH;
      if (!stockfishPath) return resolve([]);
      
      const sf = spawn(stockfishPath);
      const candidates = [];
      let isDone = false;
      
      sf.stdout.on("data", (data) => {
        if (isDone) return;
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.includes("multipv") && line.includes(" score ")) {
            // Example: info depth 10 seldepth 14 multipv 1 score cp 24 nodes 1530 nps 153000 pv e2e4 ...
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
              // Keep the latest info for this rank
              candidates[rank - 1] = { move, score, rank };
            }
          } else if (line.startsWith("bestmove")) {
            isDone = true;
            sf.kill();
            resolve(candidates.filter(Boolean));
            break;
          }
        }
      });
      sf.stdin.write(`setoption name MultiPV value ${multiPv}\n`);
      sf.stdin.write(`position fen ${fen}\n`);
      sf.stdin.write(`go depth ${depth}\n`);
    });
  }
}
