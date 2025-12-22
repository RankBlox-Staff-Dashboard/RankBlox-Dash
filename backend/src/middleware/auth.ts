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
        status?: string;
      };
    }
  }
}

/**
 * Authenticate token - allows all authenticated users (pending_verification, active, etc.)
 * Use requireActiveStatus for routes that need active users only
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = (req.headers['authorization'] || req.headers['Authorization']) as string | undefined;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.error('No token provided in request. Headers:', Object.keys(req.headers));
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
    
    // Get user info first
    const user = await dbGet<{ id: number; discord_id: string; rank: number | null; status: string }>(
      'SELECT id, discord_id, rank, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify session still exists and is valid (check by token and user_id)
    const session = await dbGet<{ id: string; user_id: number; token: string; expires_at: Date }>(
      'SELECT * FROM sessions WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [token, decoded.userId]
    );

    if (!session) {
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }

    req.user = {
      id: user.id,
      discordId: user.discord_id,
      rank: user.rank,
      status: user.status,
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

/**
 * Middleware to require active status (for protected routes like dashboard, tickets, etc.)
 */
export function requireActiveStatus(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.status !== 'active') {
    res.status(403).json({ 
      error: 'Account verification required',
      status: req.user.status 
    });
    return;
  }

  next();
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
