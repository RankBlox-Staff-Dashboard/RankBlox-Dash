import { Router, Request, Response } from 'express';
import { exchangeDiscordCode, getDiscordUser, getDiscordOAuthUrl } from '../services/discord';
import { generateToken, authenticateToken } from '../middleware/auth';
import { db } from '../models/database';
import { v4 as uuidv4 } from 'uuid';
import { initializeUserPermissions } from '../services/permissions';
import crypto from 'crypto';

const router = Router();

function getFrontendUrl(): string {
  const fallback = 'https://staffapp-frontend-y3za.onrender.com';
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const first = process.env.FRONTEND_URLS?.split(',')?.[0]?.trim();
  return first || fallback;
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
  };
}

/**
 * Initiate Discord OAuth flow
 */
router.get('/discord', (req: Request, res: Response) => {
  // Always generate and bind state server-side to prevent login CSRF / swapping.
  const state = crypto.randomUUID();
  res.cookie('oauth_state', state, { ...cookieOptions(), maxAge: 10 * 60 * 1000 });

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
    return res.redirect(`${getFrontendUrl()}/login?error=no_code`);
  }

  const expectedState = (req as any)?.cookies?.oauth_state as string | undefined;
  res.clearCookie('oauth_state', cookieOptions());
  if (!state || !expectedState || state !== expectedState) {
    return res.redirect(`${getFrontendUrl()}/login?error=invalid_state`);
  }

  try {
    // Exchange code for access token
    const accessToken = await exchangeDiscordCode(code);
    if (!accessToken) {
      return res.redirect(`${getFrontendUrl()}/login?error=token_exchange_failed`);
    }

    // Get Discord user info
    const discordUser = await getDiscordUser(accessToken);
    if (!discordUser) {
      return res.redirect(`${getFrontendUrl()}/login?error=user_fetch_failed`);
    }

    // Find or create user
    let user = await db
      .prepare('SELECT * FROM users WHERE discord_id = ?')
      .get(discordUser.id) as any;

    if (!user) {
      // Create new user
      const insertResult = await db
        .prepare('INSERT INTO users (discord_id, discord_username, status) VALUES (?, ?, ?)')
        .run(discordUser.id, discordUser.username, 'pending_verification') as any;
      
      if (!insertResult || !insertResult.lastInsertRowid) {
        throw new Error('Failed to create user');
      }
      
      // Fetch the newly created user
      user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(insertResult.lastInsertRowid) as any;
    } else {
      // Update username if changed
      await db.prepare('UPDATE users SET discord_username = ? WHERE id = ?').run(
        discordUser.username,
        user.id
      );
      // Refetch user to get updated data
      user = await db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any;
    }

    // Create session
    const sessionId = uuidv4();
    const token = generateToken(user.id, user.discord_id, user.rank);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    // Format datetime for MySQL (YYYY-MM-DD HH:MM:SS). Avoid ISO 8601 `T`/`Z` strings.
    const mysqlExpiresAt = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    // Delete old sessions and create new one
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    const sessionInsertResult = await db.prepare(
      'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
    ).run(sessionId, user.id, token, mysqlExpiresAt);
    
    // Verify session was created
    const verifySession = await db
      .prepare('SELECT * FROM sessions WHERE token = ?')
      .get(token) as any;
    
    if (!verifySession) {
      console.error('Failed to create session - session not found after insert');
      throw new Error('Failed to create session');
    }
    
    // Set httpOnly cookie as a safer default transport; frontend can still use Bearer token.
    res.cookie('session', token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });

    // Initialize permissions if user just verified Roblox
    if (user.status === 'active' && user.rank !== null) {
      await initializeUserPermissions(user.id, user.rank);
    }

    // Redirect to frontend with token in fragment (prevents referrer/header leakage)
    res.redirect(
      `${getFrontendUrl()}/auth/callback#token=${encodeURIComponent(token)}`
    );
  } catch (error) {
    console.error('Discord OAuth error:', error);
    res.redirect(`${getFrontendUrl()}/login?error=server_error`);
  }
});

/**
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await db
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
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  // Also clear cookie-based session if present
  res.clearCookie('session', cookieOptions());

  res.json({ message: 'Logged out successfully' });
});

export default router;
