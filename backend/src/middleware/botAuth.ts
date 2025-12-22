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
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  const provided = req.header('X-Bot-Token');
  if (!provided || !timingSafeEqual(provided, expected)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

