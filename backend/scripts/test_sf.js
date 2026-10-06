import { StockfishService } from '../src/services/stockfish/StockfishService.js';

async function test() {
  const avail = await StockfishService.isAvailable();
  console.log('Stockfish isAvailable:', avail);
  console.log('Binary path:', StockfishService.getBinaryPath());

  const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
  console.log('Evaluating FEN...');
  const start = Date.now();
  const res = await StockfishService.evaluatePosition(fen, 10);
  console.log('Evaluated in', Date.now() - start, 'ms:', res);
}

test().catch(console.error);
