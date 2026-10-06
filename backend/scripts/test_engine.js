import { ChessEngineService } from '../src/services/chess-engine/service.js';

async function testEngine() {
  console.log('Testing ChessEngineService.evaluatePosition...');
  const fenBefore = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
  const san = 'c5';
  const fenAfter = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';
  const start = Date.now();
  const res = await ChessEngineService.evaluatePosition(fenBefore, san, fenAfter, false);
  console.log('Result in', Date.now() - start, 'ms:', res);
}

testEngine().catch(console.error);
