import { Router, Request, Response } from 'express';
import { initializeDatabase, getCollection } from '../models/database';

const router = Router();

function requireAdminResetToken(req: Request): boolean {
  const expected = process.env.ADMIN_RESET_TOKEN;
  if (!expected || expected.trim().length === 0) return false;
  const got = (req.header('x-admin-reset-token') || '').trim();
  return got.length > 0 && got === expected;
}

/**
 * DANGEROUS: wipe all application collections.
 *
 * Protected by:
 * - env: ADMIN_RESET_TOKEN (must be set)
 * - header: X-Admin-Reset-Token: <token>
 * - body: { confirm: "RESET" }
 */
router.post('/reset-database', async (req: Request, res: Response) => {
  if (!process.env.ADMIN_RESET_TOKEN) {
    return res.status(501).json({ error: 'Reset is not enabled on this server' });
  }

  if (!requireAdminResetToken(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const confirm = (req.body?.confirm as string | undefined) || '';
  if (confirm !== 'RESET') {
    return res.status(400).json({ error: 'Missing confirmation. Send JSON body: { "confirm": "RESET" }' });
  }

  const collections = [
    'sessions',
    'verification_codes',
    'permissions',
    'activity_logs',
    'infractions',
    'tickets',
    'tracked_channels',
    'users',
    'counters',
    'discord_messages',
    'loa_requests',
  ] as const;

  try {
    // Delete all documents from each collection
    for (const collectionName of collections) {
      const collection = getCollection(collectionName);
      await collection.deleteMany({});
    }

    // Ensure schema exists after reset (recreates indexes)
    await initializeDatabase();

    return res.json({ ok: true, collectionsCleared: collections });
  } catch (error) {
    console.error('Database reset failed:', error);
    return res.status(500).json({ error: 'Database reset failed' });
  }
});

export default router;

