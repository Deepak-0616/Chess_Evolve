import { Router, Response } from 'express';
import { authenticateSupabaseUser, AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../utils/prisma.js';

const router = Router();

// GET /api/v1/training/recommendations
router.get('/recommendations', authenticateSupabaseUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const dna = await prisma.chessDNA.findUnique({
      where: { userId },
    });

    const weaknesses = dna?.topWeaknesses as string[] || ['Middlegame Tactical Blunders', 'King Safety'];

    const recommendations = weaknesses.map((w, idx) => ({
      id: `rec_${idx}_${Date.now()}`,
      targetWeakness: w,
      title: `Mastering ${w}`,
      description: `Targeted practice scenarios built from your analyzed games to reduce ${w.toLowerCase()}.`,
      difficulty: 'Intermediate',
      estimatedMinutes: 15,
      samplePositionsCount: 5,
    }));

    return res.json({ recommendations, weaknesses });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch training recommendations', details: err.message });
  }
});

// POST /api/v1/training/sessions
router.post('/sessions', authenticateSupabaseUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { targetWeakness } = req.body;

    const session = await prisma.trainingSession.create({
      data: {
        userId,
        targetWeakness: targetWeakness || 'Middlegame Tactics',
        title: `Training Drill: ${targetWeakness || 'Middlegame Tactics'}`,
        description: 'Interactive puzzle set derived from positions where similar mistakes occurred.',
        positions: [
          {
            fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
            prompt: 'Find the sharpest continuation to punish Black\'s passive piece setup.',
            bestMove: 'Ng5',
            explanation: 'Ng5 creates dual threats against f7, forcing defensive sacrifices.',
          },
          {
            fen: 'r1b2rk1/pp3ppp/2p2n2/2q1p3/4P3/2N2N2/PPP1QPPP/R4RK1 w - - 0 12',
            prompt: 'Identify the best positional rook placement for White.',
            bestMove: 'Rfd1',
            explanation: 'Rfd1 seizes control of the open d-file prior to central pawn breaks.',
          },
        ],
      },
    });

    return res.json({ session });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to start training session', details: err.message });
  }
});

export default router;
