import { Router, Response } from 'express';
import { authenticateSupabaseUser, AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../utils/prisma.js';

const router = Router();

// GET /api/v1/auth/me
router.get('/me', authenticateSupabaseUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        chessProfile: true,
        currentDna: true,
        arenaProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User record not found' });
    }

    return res.json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch user auth state', details: err.message });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', authenticateSupabaseUser, async (_req: AuthenticatedRequest, res: Response) => {
  return res.json({ message: 'Successfully logged out' });
});

export default router;
