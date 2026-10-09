import { describe, it, expect } from 'vitest';
import StockfishService from '../services/stockfish/StockfishService.js';
import { MLServiceBridge } from '../services/ml/mlService.js';
import { Chess } from 'chess.js';

describe('Play AI Intelligence & Inference Tests', () => {
  const testFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
  const testUserId = '4f61405c-08e6-4990-9036-3d02a2bc6a27';

  it('StockfishService generates multi-candidate moves with scores, ranks, and tactical flags', async () => {
    const candidates = await StockfishService.getCandidates(testFen, 10, 5);
    expect(candidates).toBeDefined();
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates.length).toBeLessThanOrEqual(5);

    for (const c of candidates) {
      expect(c.move).toBeDefined();
      expect(c.san).toBeDefined();
      expect(c.score).toBeTypeOf('number');
      expect(c.rank).toBeGreaterThanOrEqual(1);
      expect(c.centipawn_loss).toBeGreaterThanOrEqual(0);
      expect(typeof c.is_capture).toBe('boolean');
      expect(typeof c.is_check).toBe('boolean');
    }
  });

  it('Current Self ML service generates personalized candidate probabilities summing to 1.0', async () => {
    const candidates = await StockfishService.getCandidates(testFen, 10, 5);
    const prediction = await MLServiceBridge.getModelPrediction({
      userId: testUserId,
      modelType: 'CURRENT_SELF',
      fen: testFen,
      candidates,
      moveNumber: 1
    });

    expect(prediction).toBeDefined();
    expect(prediction.modelType).toBe('CURRENT_SELF');
    expect(prediction.recommendedMove).toBeDefined();
    expect(prediction.confidence).toBeGreaterThan(0);
    expect(prediction.moveProbabilities).toBeDefined();

    const probSum = Object.values(prediction.moveProbabilities).reduce((a, b) => a + b, 0);
    expect(probSum).toBeCloseTo(1.0, 2);

    // Ensure recommended move is among legal candidates
    const candMoves = candidates.map(c => c.move);
    expect(candMoves).toContain(prediction.recommendedMove);
  });

  it('Peak Self ML service selects blunder-protected moves and preserves style alignment', async () => {
    const candidates = await StockfishService.getCandidates(testFen, 10, 5);
    const prediction = await MLServiceBridge.getModelPrediction({
      userId: testUserId,
      modelType: 'PEAK_SELF',
      fen: testFen,
      candidates,
      moveNumber: 1
    });

    expect(prediction).toBeDefined();
    expect(prediction.modelType).toBe('PEAK_SELF');
    expect(prediction.recommendedMove).toBeDefined();
    expect(prediction.confidence).toBeGreaterThan(0);

    const probSum = Object.values(prediction.moveProbabilities).reduce((a, b) => a + b, 0);
    expect(probSum).toBeCloseTo(1.0, 2);

    // Peak Self recommended move should have low centipawn loss
    const chosenCand = candidates.find(c => c.move === prediction.recommendedMove);
    expect(chosenCand).toBeDefined();
    expect(chosenCand.centipawn_loss).toBeLessThan(100);
  });

  it('Applies legal moves correctly to chess board and preserves authoritative game state', () => {
    const chess = new Chess(testFen);
    const legalMoves = chess.moves({ verbose: true });
    expect(legalMoves.length).toBeGreaterThan(0);

    // Apply legal move
    const userMove = legalMoves[0];
    const applied = chess.move(userMove.san);
    expect(applied).toBeDefined();
    expect(chess.turn()).toBe('w'); // Switched turn to white
    expect(chess.fen()).not.toBe(testFen);
  });

  it('Correctly rejects illegal moves without throwing unhandled exceptions', () => {
    const chess = new Chess(testFen);
    let thrown = false;
    try {
      chess.move('e4'); // Illegal move for Black
    } catch {
      thrown = true;
    }
    expect(thrown).toBe(true);
  });
});
