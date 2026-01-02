import { Router, Request, Response } from 'express';
import { authenticateToken, requireVerified } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { db } from '../models/database';
import { getCurrentWeekStart } from '../utils/messages';

const router = Router();

// All ticket routes require full verification
router.use(authenticateToken);
router.use(requireVerified);

function parsePositiveInt(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * List tickets
 */
router.get('/', requirePermission('VIEW_TICKETS'), async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;

    let query = `
      SELECT t.*, 
             u.discord_username as claimed_by_username,
             u.roblox_username as claimed_by_roblox
      FROM tickets t
      LEFT JOIN users u ON t.claimed_by = u.id
    `;

    const params: any[] = [];

    if (status) {
      const allowed = new Set(['open', 'claimed', 'resolved', 'closed']);
      if (!allowed.has(status)) {
        return res.status(400).json({ error: 'Invalid status filter' });
      }
      query += ' WHERE t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC';

    const tickets = await db.prepare(query).all(...params) as any[];

    // Ensure we always return an array (never undefined or null)
    res.json(tickets || []);
  } catch (error: any) {
    console.error('[Tickets] Error fetching tickets:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

/**
 * Claim a ticket
 */
router.post('/:id/claim', requirePermission('CLAIM_TICKETS'), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const ticketId = parsePositiveInt(req.params.id);
    if (!ticketId) {
      return res.status(400).json({ error: 'Invalid ticket id' });
    }

    // Race-safe claim: only claim if currently open
    const claimResult = await db.prepare(
      "UPDATE tickets SET claimed_by = ?, status = 'claimed' WHERE id = ? AND status = 'open'"
    ).run(req.user.id, ticketId);

    if (!claimResult || claimResult.changes === 0) {
      // Either ticket doesn't exist OR not open anymore
      const existing = await db.prepare('SELECT id, status FROM tickets WHERE id = ?').get(ticketId) as any;
      if (!existing) return res.status(404).json({ error: 'Ticket not found' });
      return res.status(409).json({ error: 'Ticket is not available to claim' });
    }

    // Increment user's tickets_claimed count for current week
    const weekStartStr = getCurrentWeekStart();

    // Check if activity log exists
    let activityLog = await db
      .prepare('SELECT * FROM activity_logs WHERE user_id = ? AND week_start = ?')
      .get(req.user.id, weekStartStr) as any;

    if (activityLog) {
      await db.prepare(
        'UPDATE activity_logs SET tickets_claimed = tickets_claimed + 1 WHERE user_id = ? AND week_start = ?'
      ).run(req.user.id, weekStartStr);
    } else {
      await db.prepare(
        'INSERT INTO activity_logs (user_id, week_start, tickets_claimed) VALUES (?, ?, 1)'
      ).run(req.user.id, weekStartStr);
    }

    res.json({ message: 'Ticket claimed successfully' });
  } catch (error) {
    console.error('Error claiming ticket:', error);
    res.status(500).json({ error: 'Failed to claim ticket' });
  }
});

/**
 * Resolve a ticket
 */
router.post('/:id/resolve', requirePermission('CLAIM_TICKETS'), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const ticketId = parsePositiveInt(req.params.id);
    if (!ticketId) {
      return res.status(400).json({ error: 'Invalid ticket id' });
    }

    // Race-safe resolve: only resolve if claimed by this user and still claimed
    const resolveResult = await db.prepare(
      "UPDATE tickets SET status = 'resolved' WHERE id = ? AND claimed_by = ? AND status = 'claimed'"
    ).run(ticketId, req.user.id);

    if (!resolveResult || resolveResult.changes === 0) {
      const ticket = await db.prepare('SELECT id, status, claimed_by FROM tickets WHERE id = ?').get(ticketId) as any;
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      if (ticket.claimed_by !== req.user.id) return res.status(403).json({ error: 'You can only resolve tickets you claimed' });
      return res.status(409).json({ error: 'Ticket is not in claimed status' });
    }

    // Increment user's tickets_resolved count for current week
    const weekStartStr = getCurrentWeekStart();

    // Check if activity log exists
    let activityLog = await db
      .prepare('SELECT * FROM activity_logs WHERE user_id = ? AND week_start = ?')
      .get(req.user.id, weekStartStr) as any;

    if (activityLog) {
      await db.prepare(
        'UPDATE activity_logs SET tickets_resolved = tickets_resolved + 1 WHERE user_id = ? AND week_start = ?'
      ).run(req.user.id, weekStartStr);
    } else {
      await db.prepare(
        'INSERT INTO activity_logs (user_id, week_start, tickets_resolved) VALUES (?, ?, 1)'
      ).run(req.user.id, weekStartStr);
    }

    res.json({ message: 'Ticket resolved successfully' });
  } catch (error) {
    console.error('Error resolving ticket:', error);
    res.status(500).json({ error: 'Failed to resolve ticket' });
  }
});

export default router;

