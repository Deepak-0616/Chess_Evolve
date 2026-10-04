import { Router, Response } from 'express';
import { authenticateSupabaseUser, AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../utils/prisma.js';
import axios from 'axios';

const router = Router();

// POST /api/v1/coach/chat
router.post('/chat', authenticateSupabaseUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const dna = await prisma.chessDNA.findUnique({
      where: { userId },
    });

    const profile = await prisma.chessProfile.findUnique({
      where: { userId },
    });

    let aiReply = '';

    // Check if OpenAI API Key is provided
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are the AI Chess Evolve Grandmaster Coach. You analyze games and give deep actionable insights.
User context:
- Chess.com Username: ${profile?.chessUsername || 'Player'}
- Top Strengths: ${(dna?.topStrengths as string[])?.join(', ') || 'Balanced'}
- Top Weaknesses: ${(dna?.topWeaknesses as string[])?.join(', ') || 'Tactical Accuracy'}
- Aggression score: ${dna?.aggression || 50}/100
- King Safety score: ${dna?.kingSafety || 50}/100`,
              },
              { role: 'user', content: message },
            ],
          },
          { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
        );
        aiReply = response.data.choices[0]?.message?.content || '';
      } catch (openAiErr) {
        console.warn('OpenAI API request failed, using structured fallback response:', openAiErr);
      }
    }

    if (!aiReply) {
      // High quality structured coach response fallback
      const userWeakness = (dna?.topWeaknesses as string[])?.[0] || 'Middlegame Tactics';
      aiReply = `Based on your analyzed games, your primary area for growth is **${userWeakness}**.\n\n` +
        `• **Opening Repertoire**: You show solid understanding, but ensure you do not rush pawn pushes before securing king safety.\n` +
        `• **Middlegame**: Focus on calculating forced lines (checks, captures, threats) before committing to positional moves.\n` +
        `• **Peak Self Tip**: Your Peak Self model succeeds by converting slight material advantages earlier while preserving your active attacking style!`;
    }

    return res.json({ reply: aiReply, timestamp: new Date() });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate coach advice', details: err.message });
  }
});

export default router;
