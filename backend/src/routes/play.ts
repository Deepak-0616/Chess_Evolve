import { Router, Response } from 'express';
import { authenticateSupabaseUser, AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../utils/prisma.js';
import { Chess } from 'chess.js';
import { MLServiceBridge } from '../services/ml/mlService.js';

const router = Router();

// POST /api/v1/play/sessions
router.post('/sessions', authenticateSupabaseUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { opponentModelType = 'CURRENT_SELF', userColor = 'WHITE' } = req.body;

    // Check if model is READY
    const model = await prisma.mLModelVersion.findFirst({
      where: {
        userId,
        modelType: opponentModelType,
        status: 'READY',
      },
      orderBy: { version: 'desc' },
    });

    if (!model) {
      return res.status(400).json({
        error: `Your ${opponentModelType} model is not trained yet. Connect Chess.com and run synchronization first.`,
      });
    }

    const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    const session = await prisma.playSession.create({
      data: {
        userId,
        opponentModelType,
        opponentModelVersionId: model.id,
        userColor: userColor.toUpperCase() === 'BLACK' ? 'BLACK' : 'WHITE',
        fen: initialFen,
        pgn: '',
        moveHistory: [],
        status: 'IN_PROGRESS',
      },
    });

    // If user selected BLACK, AI model makes the first move (White)
    if (session.userColor === 'BLACK') {
      const chess = new Chess(initialFen);
      const legalMoves = chess.moves({ verbose: false });
      const prediction = await MLServiceBridge.getModelPrediction({
        userId,
        modelType: opponentModelType,
        fen: initialFen,
        legalMoves,
      });

      const aiMove = prediction.recommendedMove || legalMoves[0];
      chess.move(aiMove);

      const updatedSession = await prisma.playSession.update({
        where: { id: session.id },
        data: {
          fen: chess.fen(),
          pgn: chess.pgn(),
          moveHistory: [{ move: aiMove, by: opponentModelType, fenAfter: chess.fen() }],
        },
      });
      return res.json({ session: updatedSession, aiMove });
    }

    return res.json({ session });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create play session', details: err.message });
  }
});

// GET /api/v1/play/sessions/:sessionId
router.get('/sessions/:sessionId', authenticateSupabaseUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const session = await prisma.playSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized or session not found' });
    }

    return res.json({ session });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch session', details: err.message });
  }
});

// POST /api/v1/play/sessions/:sessionId/moves
router.post('/sessions/:sessionId/moves', authenticateSupabaseUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    const { move } = req.body;

    const session = await prisma.playSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized or session not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Play session is already completed' });
    }

    const chess = new Chess(session.fen);

    // Apply user move
    let userMoveObj;
    try {
      userMoveObj = chess.move(move);
    } catch {
      return res.status(400).json({ error: `Illegal move: ${move}` });
    }

    const currentHistory = (session.moveHistory as any[]) || [];
    currentHistory.push({ move: userMoveObj.san, by: 'USER', fenAfter: chess.fen() });

    // Check game over after user move
    if (chess.isGameOver()) {
      let status: 'USER_WON' | 'MODEL_WON' | 'DRAW' = 'DRAW';
      if (chess.isCheckmate()) status = 'USER_WON';

      const updated = await prisma.playSession.update({
        where: { id: session.id },
        data: {
          fen: chess.fen(),
          pgn: chess.pgn(),
          moveHistory: currentHistory,
          status,
        },
      });
      return res.json({ session: updated, isGameOver: true, status });
    }

    // AI model counter-move
    const aiLegalMoves = chess.moves({ verbose: false });
    const prediction = await MLServiceBridge.getModelPrediction({
      userId,
      modelType: session.opponentModelType,
      fen: chess.fen(),
      legalMoves: aiLegalMoves,
    });

    const aiMoveSan = prediction.recommendedMove || aiLegalMoves[0];
    const aiMoveObj = chess.move(aiMoveSan);

    currentHistory.push({ move: aiMoveObj.san, by: session.opponentModelType, fenAfter: chess.fen() });

    let finalStatus: 'IN_PROGRESS' | 'USER_WON' | 'MODEL_WON' | 'DRAW' = 'IN_PROGRESS';
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) finalStatus = 'MODEL_WON';
      else finalStatus = 'DRAW';
    }

    const finalSession = await prisma.playSession.update({
      where: { id: session.id },
      data: {
        fen: chess.fen(),
        pgn: chess.pgn(),
        moveHistory: currentHistory,
        status: finalStatus,
      },
    });

    return res.json({
      session: finalSession,
      aiMove: aiMoveObj.san,
      prediction,
      isGameOver: finalStatus !== 'IN_PROGRESS',
      status: finalStatus,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process move', details: err.message });
  }
});

// POST /api/v1/play/sessions/:sessionId/resign
router.post('/sessions/:sessionId/resign', authenticateSupabaseUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const session = await prisma.playSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized or session not found' });
    }

    const updated = await prisma.playSession.update({
      where: { id: sessionId },
      data: { status: 'RESIGNED' },
    });

    return res.json({ session: updated, message: 'Game resigned' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to resign session', details: err.message });
  }
});

export default router;
