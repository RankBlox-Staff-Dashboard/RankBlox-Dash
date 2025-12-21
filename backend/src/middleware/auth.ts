import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../utils/types';
import { dbGet } from '../utils/db-helpers';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        discordId: string;
        rank: number | null;
      };
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    // Verify session still exists and is valid
    const session = await dbGet<{ id: string; user_id: number; token: string; expires_at: Date }>(
      'SELECT * FROM sessions WHERE id = $1 AND expires_at > NOW()',
      [decoded.userId.toString()]
    );

    if (!session) {
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }

    // Get user to ensure they're still active
    const user = await dbGet<{ id: number; discord_id: string; rank: number | null; status: string }>(
      'SELECT id, discord_id, rank, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!user || user.status !== 'active') {
      res.status(403).json({ error: 'Account is not active' });
      return;
    }

    req.user = {
      id: user.id,
      discordId: user.discord_id,
      rank: user.rank,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    res.status(500).json({ error: 'Authentication error' });
  }
}

export function generateToken(userId: number, discordId: string, rank: number | null): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  const payload: JwtPayload = {
    userId,
    discordId,
    rank,
  };

  // Token expires in 7 days
  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
}

