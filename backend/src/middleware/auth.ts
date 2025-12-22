import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../utils/types';
import { db } from '../models/database';
import { isImmuneRank } from '../utils/immunity';

// Export this interface so other files can use it
export interface AuthenticatedUser {
  id: number;
  discordId: string;
  discord_username: string;
  robloxId: string | null;
  roblox_username: string | null;
  rank: number | null;
  status: 'active' | 'inactive' | 'pending_verification';
}

// Extend Express Request globally
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
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
  const anyReq = req as any;
  const token = anyReq?.cookies?.session;
  return typeof token === 'string' && token.length > 0 ? token : undefined;
}

/**
 * Core authentication middleware.
 * Validates JWT token and session, attaches user to request.
 * Does NOT check verification status - use requireVerified for that.
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = getBearerToken(req) ?? getCookieToken(req);

  if (!token) {
    res.status(401).json({ error: 'Authentication required', code: 'NO_TOKEN' });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as JwtPayload;
    
    // Verify session still exists and is valid (MySQL syntax with NOW())
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
      res.status(401).json({ error: 'Session expired or invalid', code: 'SESSION_EXPIRED' });
      return;
    }

    // Defensive consistency check
    if (decoded.userId !== session.user_id) {
      res.status(403).json({ error: 'Invalid token', code: 'TOKEN_USER_MISMATCH' });
      return;
    }

    // Get FRESH user info from database (MySQL uses backticks for reserved words)
    const user = await db
      .prepare('SELECT id, discord_id, discord_username, roblox_id, roblox_username, `rank`, status FROM users WHERE id = ?')
      .get(session.user_id) as { 
        id: number; 
        discord_id: string;
        discord_username: string;
        roblox_id: string | null;
        roblox_username: string | null;
        rank: number | null; 
        status: 'active' | 'inactive' | 'pending_verification';
      } | undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    // Attach FRESH user data to request
    req.user = {
      id: user.id,
      discordId: user.discord_id,
      discord_username: user.discord_username,
      robloxId: user.roblox_id,
      roblox_username: user.roblox_username,
      rank: user.rank,
      status: user.status,
    };
    
    req.sessionToken = token;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Middleware to enforce FULL verification chain.
 */
export function requireVerified(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
    return;
  }

  if (!req.user.discordId) {
    res.status(403).json({ 
      error: 'Discord verification required', 
      code: 'DISCORD_NOT_VERIFIED',
      verification_step: 'discord'
    });
    return;
  }

  if (!req.user.robloxId) {
    res.status(403).json({ 
      error: 'Roblox verification required', 
      code: 'ROBLOX_NOT_VERIFIED',
      verification_step: 'roblox'
    });
    return;
  }

  if (req.user.status !== 'active' && !isImmuneRank(req.user.rank)) {
    if (req.user.status === 'pending_verification') {
      res.status(403).json({ 
        error: 'Account verification incomplete', 
        code: 'VERIFICATION_PENDING',
        verification_step: 'pending'
      });
    } else if (req.user.status === 'inactive') {
      res.status(403).json({ 
        error: 'Account is inactive', 
        code: 'ACCOUNT_INACTIVE'
      });
    } else {
      res.status(403).json({ 
        error: 'Invalid account status', 
        code: 'INVALID_STATUS'
      });
    }
    return;
  }

  if (req.user.rank === null) {
    res.status(403).json({ 
      error: 'Rank not assigned. Please complete Roblox verification.', 
      code: 'NO_RANK',
      verification_step: 'roblox'
    });
    return;
  }

  next();
}

/**
 * Generate a new JWT token for a user.
 */
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

  return jwt.sign(payload, jwtSecret, { expiresIn: '7d', algorithm: 'HS256' });
}

/**
 * Update session with new token.
 */
export async function refreshSessionToken(
  userId: number,
  discordId: string,
  rank: number | null,
  oldToken: string
): Promise<string> {
  const newToken = generateToken(userId, discordId, rank);
  
  await db.prepare('UPDATE sessions SET token = ? WHERE token = ? AND user_id = ?')
    .run(newToken, oldToken, userId);
  
  return newToken;
}
