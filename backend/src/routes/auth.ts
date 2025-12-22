import { Router, Request, Response } from 'express';
import { exchangeDiscordCode, getDiscordUser, getDiscordOAuthUrl } from '../services/discord';
import { generateToken, authenticateToken } from '../middleware/auth';
import { db } from '../models/database';
import { v4 as uuidv4 } from 'uuid';
import { initializeUserPermissions } from '../services/permissions';

const router = Router();

/**
 * Initiate Discord OAuth flow
 */
router.get('/discord', (req: Request, res: Response) => {
  const state = req.query.state as string | undefined;
  const url = getDiscordOAuthUrl(state);
  res.redirect(url);
});

/**
 * Handle Discord OAuth callback
 */
router.get('/discord/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=no_code`);
  }

  try {
    // Exchange code for access token
    const accessToken = await exchangeDiscordCode(code);
    if (!accessToken) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=token_exchange_failed`);
    }

    // Get Discord user info
    const discordUser = await getDiscordUser(accessToken);
    if (!discordUser) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=user_fetch_failed`);
    }

    // Find or create user
    let user = db
      .prepare('SELECT * FROM users WHERE discord_id = ?')
      .get(discordUser.id) as any;

    if (!user) {
      // Create new user
      const result = db
        .prepare(
          'INSERT INTO users (discord_id, discord_username, status) VALUES (?, ?, ?)'
        )
        .run(discordUser.id, discordUser.username, 'pending_verification');

      user = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(result.lastInsertRowid) as any;
    } else {
      // Update username if changed
      db.prepare('UPDATE users SET discord_username = ? WHERE id = ?').run(
        discordUser.username,
        user.id
      );
      user.discord_username = discordUser.username;
    }

    // Create session
    const sessionId = uuidv4();
    const token = generateToken(user.id, user.discord_id, user.rank);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    db.prepare(
      'INSERT OR REPLACE INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
    ).run(sessionId, user.id, token, expiresAt.toISOString());

    // Initialize permissions if user just verified Roblox
    if (user.status === 'active' && user.rank !== null) {
      initializeUserPermissions(user.id, user.rank);
    }

    // Redirect to frontend with token
    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`
    );
  } catch (error) {
    console.error('Discord OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=server_error`);
  }
});

/**
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(req.user.id) as any;

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    discord_id: user.discord_id,
    discord_username: user.discord_username,
    roblox_id: user.roblox_id,
    roblox_username: user.roblox_username,
    rank: user.rank,
    rank_name: user.rank_name,
    status: user.status,
    created_at: user.created_at,
  });
});

/**
 * Logout
 */
router.post('/logout', (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }

  res.json({ message: 'Logged out successfully' });
});

export default router;

