import { Router, Response } from 'express';
import { authenticateSupabaseUser, AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../utils/prisma.js';

const router = Router();

// GET /api/v1/profile
router.get('/', authenticateSupabaseUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chessProfile: true,
        arenaProfile: true,
        currentDna: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({ profile: user });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch user profile', details: err.message });
  }
});

// PATCH /api/v1/profile
router.patch('/', authenticateSupabaseUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { displayName, avatarUrl, arenaVisibility } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: displayName || undefined,
        avatarUrl: avatarUrl || undefined,
      },
    });

    if (arenaVisibility) {
      await prisma.arenaProfile.upsert({
        where: { userId },
        create: {
          userId,
          visibility: arenaVisibility,
        },
        update: {
          visibility: arenaVisibility,
        },
      });
    }

    return res.json({ message: 'Profile updated successfully', user });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update profile', details: err.message });
  }
});

export default router;
