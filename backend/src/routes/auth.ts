import { Router, Request, Response } from 'express';
import { exchangeDiscordCode, getDiscordUser, getDiscordOAuthUrl } from '../services/discord';
import { generateToken, authenticateToken } from '../middleware/auth';
import { dbGet, dbRun } from '../utils/db-helpers';
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
  const error = req.query.error as string | undefined;

  // Handle Discord OAuth errors
  if (error) {
    console.error('Discord OAuth error:', error);
    return res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_error&message=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=no_code`);
  }

  try {
    // Exchange code for access token
    const accessToken = await exchangeDiscordCode(code);
    if (!accessToken) {
      console.error('Failed to exchange Discord code for token');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=token_exchange_failed`);
    }

    // Get Discord user info
    const discordUser = await getDiscordUser(accessToken);
    if (!discordUser) {
      console.error('Failed to fetch Discord user info');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=user_fetch_failed`);
    }

    // Find or create user
    let user = await dbGet<any>('SELECT * FROM users WHERE discord_id = $1', [discordUser.id]);

    if (!user) {
      // Create new user
      const result = await dbRun(
        'INSERT INTO users (discord_id, discord_username, status) VALUES ($1, $2, $3) RETURNING *',
        [discordUser.id, discordUser.username, 'pending_verification']
      );
      user = result.rows[0];
    } else {
      // Update username if changed
      await dbRun('UPDATE users SET discord_username = $1 WHERE id = $2', [
        discordUser.username,
        user.id,
      ]);
      user.discord_username = discordUser.username;
    }

    // Create session
    const sessionId = uuidv4();
    const token = generateToken(user.id, user.discord_id, user.rank);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Delete any existing sessions for this user first, then create new one
    await dbRun('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    const sessionResult = await dbRun(
      'INSERT INTO sessions (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
      [sessionId, user.id, token, expiresAt.toISOString()]
    );
    
    // Verify session was created
    const verifySession = await dbGet<{ id: string; token: string }>(
      'SELECT id, token FROM sessions WHERE user_id = $1 AND token = $2',
      [user.id, token]
    );
    
    if (!verifySession) {
      console.error('Failed to create session in database');
      throw new Error('Failed to create session');
    }
    
    console.log('Session created successfully for user:', user.id);

    // Initialize permissions if user just verified Roblox
    if (user.status === 'active' && user.rank !== null) {
      await initializeUserPermissions(user.id, user.rank);
    }

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (error: any) {
    console.error('Discord OAuth error:', error);
    console.error('Error details:', error.message, error.stack);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?error=server_error&message=${encodeURIComponent(error.message || 'Unknown error')}`);
  }
});

/**
 * Get current user profile (accessible to all authenticated users, including pending)
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await dbGet<any>('SELECT * FROM users WHERE id = $1', [req.user.id]);

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
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * Logout
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    await dbRun('DELETE FROM sessions WHERE token = $1', [token]);
  }

  res.json({ message: 'Logged out successfully' });
});

export default router;
