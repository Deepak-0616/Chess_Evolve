import 'dotenv/config';
import { StockfishService } from '../src/services/stockfish/StockfishService.js';

async function test() {
  console.log('Stockfish Path:', process.env.STOCKFISH_PATH);
  const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
  console.log('Starting evaluatePosition with timeout 5000ms...');
  const t0 = Date.now();
  const res = await StockfishService.evaluatePosition(fen, 10);
  console.log('Finished in', Date.now() - t0, 'ms:', res);
}

test().catch(console.error);
