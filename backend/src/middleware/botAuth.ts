import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

function timingSafeEqual(a: string, b: string): boolean {
  // Validate inputs
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  try {
    const aBuf = Buffer.from(a, 'utf8');
    const bBuf = Buffer.from(b, 'utf8');
    
    // Length check must happen before timing-safe comparison
    if (aBuf.length !== bBuf.length) {
      return false;
    }
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch (error) {
    // If buffer creation fails, tokens don't match
    return false;
  }
}

/**
 * Require a shared secret for bot -> backend calls.
 * Bot must send `X-Bot-Token: <token>`.
 */
export function requireBotAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.BOT_API_TOKEN;
  if (!expected || expected.trim().length === 0) {
    // Fail closed in production. In local dev you must still set a token.
    console.error('[BotAuth] Bot auth misconfigured: BOT_API_TOKEN is not set');
    res.status(500).json({
      error: 'Server configuration error',
      missing: ['BOT_API_TOKEN'],
    });
    return;
  }

  const provided = req.header('X-Bot-Token');
  
  // Check if token is provided
  if (!provided || typeof provided !== 'string' || provided.trim().length === 0) {
    console.warn(`[BotAuth] Authentication failed - Token missing or empty`);
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  // Validate token length to prevent DoS attacks with extremely long tokens
  if (provided.length > 1000) {
    console.warn(`[BotAuth] Token too long (${provided.length} chars) - possible attack`);
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  // Validate expected token is a string
  if (typeof expected !== 'string' || expected.trim().length === 0) {
    console.error('[BotAuth] Expected token is invalid');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }
  
  // Use timing-safe comparison
  try {
    if (!timingSafeEqual(provided, expected)) {
      console.warn(`[BotAuth] Authentication failed - Token mismatch`);
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  } catch (error) {
    console.error('[BotAuth] Error during token comparison:', error);
    res.status(500).json({ error: 'Authentication error' });
    return;
  }

  next();
}

