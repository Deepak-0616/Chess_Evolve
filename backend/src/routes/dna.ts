import { Router, Response } from 'express';
import { authenticateSupabaseUser, AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../utils/prisma.js';
import { ChessDnaService } from '../services/dna/service.js';

const router = Router();

// GET /api/v1/dna/current
router.get('/current', authenticateSupabaseUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    let dna = await prisma.chessDNA.findUnique({
      where: { userId },
    });

    if (!dna) {
      const generated = await ChessDnaService.generateDnaForUser(userId);
      dna = await prisma.chessDNA.findUnique({ where: { userId } });
      if (!dna) {
        return res.json({ dna: generated });
      }
    }

    return res.json({ dna });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch Chess DNA', details: err.message });
  }
});

// GET /api/v1/dna/history
router.get('/history', authenticateSupabaseUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const dnaVersions = await prisma.chessDNAVersion.findMany({
      where: { userId },
      orderBy: { version: 'asc' },
    });

    return res.json({ dnaVersions });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch Chess DNA history', details: err.message });
  }
});

export default router;
