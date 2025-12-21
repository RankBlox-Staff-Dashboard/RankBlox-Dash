import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { dbGet, dbAll, dbRun } from '../utils/db-helpers';

const router = Router();
router.use(authenticateToken);

/**
 * Get current week start (Monday)
 */
function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
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
      query += ' WHERE t.status = $1';
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC';

    const tickets = await dbAll<any>(query, params);

    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
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
    const ticketId = parseInt(req.params.id);

    // Check if ticket exists and is available
    const ticket = await dbGet<any>(
      'SELECT * FROM tickets WHERE id = $1',
      [ticketId]
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status !== 'open') {
      return res.status(400).json({ error: 'Ticket is not available to claim' });
    }

    // Update ticket
    await dbRun(
      'UPDATE tickets SET claimed_by = $1, status = $2 WHERE id = $3',
      [req.user.id, 'claimed', ticketId]
    );

    // Increment user's tickets_claimed count for current week
    const weekStartStr = getCurrentWeekStart();

    // Check if activity log exists
    let activityLog = await dbGet<any>(
      'SELECT * FROM activity_logs WHERE user_id = $1 AND week_start = $2',
      [req.user.id, weekStartStr]
    );

    if (activityLog) {
      await dbRun(
        'UPDATE activity_logs SET tickets_claimed = tickets_claimed + 1 WHERE user_id = $1 AND week_start = $2',
        [req.user.id, weekStartStr]
      );
    } else {
      await dbRun(
        'INSERT INTO activity_logs (user_id, week_start, tickets_claimed, messages_sent, tickets_resolved) VALUES ($1, $2, 1, 0, 0)',
        [req.user.id, weekStartStr]
      );
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
    const ticketId = parseInt(req.params.id);

    // Check if ticket exists and is claimed by user
    const ticket = await dbGet<any>(
      'SELECT * FROM tickets WHERE id = $1',
      [ticketId]
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.claimed_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only resolve tickets you claimed' });
    }

    if (ticket.status !== 'claimed') {
      return res.status(400).json({ error: 'Ticket is not in claimed status' });
    }

    // Update ticket
    await dbRun('UPDATE tickets SET status = $1 WHERE id = $2', ['resolved', ticketId]);

    // Increment user's tickets_resolved count for current week
    const weekStartStr = getCurrentWeekStart();

    // Check if activity log exists
    let activityLog = await dbGet<any>(
      'SELECT * FROM activity_logs WHERE user_id = $1 AND week_start = $2',
      [req.user.id, weekStartStr]
    );

    if (activityLog) {
      await dbRun(
        'UPDATE activity_logs SET tickets_resolved = tickets_resolved + 1 WHERE user_id = $1 AND week_start = $2',
        [req.user.id, weekStartStr]
      );
    } else {
      await dbRun(
        'INSERT INTO activity_logs (user_id, week_start, tickets_resolved, messages_sent, tickets_claimed) VALUES ($1, $2, 1, 0, 0)',
        [req.user.id, weekStartStr]
      );
    }

    res.json({ message: 'Ticket resolved successfully' });
  } catch (error) {
    console.error('Error resolving ticket:', error);
    res.status(500).json({ error: 'Failed to resolve ticket' });
  }
});

export default router;
