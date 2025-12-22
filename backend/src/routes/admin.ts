import { Router, Request, Response } from 'express';
import { pool, initializeDatabase } from '../models/database';
import { timingSafeEqual, logSecurityEvent, getClientIp, getUserAgent } from '../utils/security';
import { strictAdminRateLimit } from '../middleware/rateLimits';

const router = Router();

function requireAdminResetToken(req: Request): boolean {
  const expected = process.env.ADMIN_RESET_TOKEN;
  if (!expected || expected.trim().length === 0) return false;
  const got = (req.header('x-admin-reset-token') || '').trim();
  if (got.length === 0) return false;
  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(got, expected.trim());
}

/**
 * DANGEROUS: wipe all application tables.
 *
 * Protected by:
 * - Rate limit: 5 requests per hour
 * - env: ADMIN_RESET_TOKEN (must be set)
 * - header: X-Admin-Reset-Token: <token>
 * - body: { confirm: "RESET" }
 */
router.post('/reset-database', strictAdminRateLimit, async (req: Request, res: Response) => {
  // Log all reset attempts for security auditing
  logSecurityEvent({
    type: 'ADMIN_RESET_ATTEMPT',
    ip: getClientIp(req),
    path: req.path,
    method: req.method,
    userAgent: getUserAgent(req),
    details: 'Database reset endpoint accessed',
  });

  if (!process.env.ADMIN_RESET_TOKEN) {
    return res.status(501).json({ error: 'Reset is not enabled on this server' });
  }

  if (!requireAdminResetToken(req)) {
    logSecurityEvent({
      type: 'ADMIN_RESET_ATTEMPT',
      ip: getClientIp(req),
      path: req.path,
      method: req.method,
      userAgent: getUserAgent(req),
      details: 'Invalid admin reset token provided',
    });
    return res.status(403).json({ error: 'Forbidden' });
  }

  const confirm = (req.body?.confirm as string | undefined) || '';
  if (confirm !== 'RESET') {
    return res.status(400).json({ error: 'Missing confirmation. Send JSON body: { "confirm": "RESET" }' });
  }

  const tables = [
    'sessions',
    'verification_codes',
    'permissions',
    'activity_logs',
    'infractions',
    'tickets',
    'tracked_channels',
    'users',
  ] as const;

  try {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tables) {
      // Use identifier placeholder to avoid injection.
      await pool.query('TRUNCATE TABLE ??', [table]);
    }
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    // Ensure schema exists after reset.
    await initializeDatabase();

    return res.json({ ok: true, tablesTruncated: tables });
  } catch (error) {
    console.error('Database reset failed:', error);
    return res.status(500).json({ error: 'Database reset failed' });
  }
});

export default router;

