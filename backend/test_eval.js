import dotenv from "dotenv";
dotenv.config();

import { ChessEngineService } from "./src/services/chess-engine/service.js";

async function main() {
  const res = await ChessEngineService.evaluatePosition(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 
    'e4', 
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 
    true
  );
  console.log(res);
  process.exit(0);
}

main();
