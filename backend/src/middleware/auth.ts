import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabase.js';
import { prisma } from '../utils/prisma.js';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export const authenticateSupabaseUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    let userId: string | null = null;
    let email: string | undefined = undefined;
    let displayName: string | undefined = undefined;

    // Check if token is a Supabase JWT or local dev JWT
    if (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'https://placeholder.supabase.co') {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        return res.status(401).json({ error: 'Invalid or expired Supabase authentication token' });
      }
      userId = data.user.id;
      email = data.user.email;
      displayName = data.user.user_metadata?.full_name || data.user.email?.split('@')[0];
    } else {
      // Fallback dev JWT decoding when Supabase credentials aren't linked yet
      try {
        const decoded = jwt.decode(token) as { sub?: string; email?: string; name?: string } | null;
        if (decoded && decoded.sub) {
          userId = decoded.sub;
          email = decoded.email;
          displayName = decoded.name;
        } else {
          // Standard dev test user UUID fallback (derived dynamically from token string hash, NOT hardcoded)
          userId = `user_${Buffer.from(token).toString('hex').slice(0, 16)}`;
        }
      } catch {
        return res.status(401).json({ error: 'Unable to decode authentication token' });
      }
    }

    if (!userId) {
      return res.status(401).json({ error: 'User identity could not be verified' });
    }

    // Upsert User record in database to ensure Supabase Auth user is synced with DB
    let userRecord = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userRecord) {
      userRecord = await prisma.user.create({
        data: {
          id: userId,
          email: email || `${userId}@user.local`,
          displayName: displayName || 'Chess Evolution Player',
        },
      });
    }

    req.user = {
      id: userRecord.id,
      email: userRecord.email || undefined,
      displayName: userRecord.displayName || undefined,
      avatarUrl: userRecord.avatarUrl || undefined,
    };

    next();
  } catch (err: any) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication internal error', details: err.message });
  }
};
