import "dotenv/config";
import { StockfishService } from "./src/services/stockfish/StockfishService.js";

async function verify() {
  console.log("Verifying Stockfish...");
  try {
    const res = await StockfishService.evaluatePosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 10);
    console.log("Stockfish OK! Result:", res);
    process.exit(0);
  } catch (err) {
    console.error("Stockfish failed:", err);
    process.exit(1);
  }
}

verify();
