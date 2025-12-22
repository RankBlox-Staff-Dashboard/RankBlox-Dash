import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../utils/types';
import { db } from '../models/database';

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

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
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
    const session = db
      .prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")')
      .get(decoded.userId.toString()) as { id: string; user_id: number; token: string; expires_at: string } | undefined;

    if (!session) {
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }

    // Get user to ensure they're still active
    const user = db
      .prepare('SELECT id, discord_id, rank, status FROM users WHERE id = ?')
      .get(decoded.userId) as { id: number; discord_id: string; rank: number | null; status: string } | undefined;

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

