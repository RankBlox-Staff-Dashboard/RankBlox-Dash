import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../utils/types';
import { db } from '../models/database';
import crypto from 'crypto';

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

function getBearerToken(req: Request): string | undefined {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return undefined;
  const parts = authHeader.split(' ');
  if (parts.length !== 2) return undefined;
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return undefined;
  return token;
}

function getCookieToken(req: Request): string | undefined {
  // cookie-parser populates req.cookies, but keep this defensive for environments without it
  const anyReq = req as any;
  const token = anyReq?.cookies?.session;
  return typeof token === 'string' && token.length > 0 ? token : undefined;
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = getBearerToken(req) ?? getCookieToken(req);

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
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as JwtPayload;
    
    // Verify session still exists and is valid (check by token)
    let session: { id: string; user_id: number; token: string; expires_at: Date } | undefined;
    try {
      session = await db
        .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > NOW()')
        .get(token) as { id: string; user_id: number; token: string; expires_at: Date } | undefined;
    } catch (dbError) {
      console.error('Database error during session lookup:', dbError);
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (!session) {
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }

    // Defensive consistency check: token must map to the same user in DB session
    if (decoded.userId !== session.user_id) {
      // If this ever happens it's an integrity issue; treat token as invalid.
      res.status(403).json({ error: 'Invalid token' });
      return;
    }

    // Get user info (allow all statuses including pending_verification)
    // Note: `rank` must be escaped with backticks because it's a MySQL reserved keyword
    const user = await db
      .prepare('SELECT id, discord_id, `rank`, status FROM users WHERE id = ?')
      .get(session.user_id) as { id: number; discord_id: string; rank: number | null; status: string } | undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
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
  return jwt.sign(payload, jwtSecret, { expiresIn: '7d', algorithm: 'HS256' });
}
