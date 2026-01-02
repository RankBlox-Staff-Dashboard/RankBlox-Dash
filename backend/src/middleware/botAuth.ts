import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
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
  
  // Validate token length to prevent DoS attacks with extremely long tokens
  if (provided && provided.length > 1000) {
    console.warn(`[BotAuth] Token too long (${provided.length} chars) - possible attack`);
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  if (!provided || !timingSafeEqual(provided, expected)) {
    console.warn(`[BotAuth] Authentication failed - Token mismatch or missing`);
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

