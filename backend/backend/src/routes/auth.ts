import { Router, Request, Response } from 'express';
import { exchangeDiscordCode, getDiscordUser, getDiscordOAuthUrl } from '../services/discord';
import { generateToken, authenticateToken, generateRefreshToken } from '../middleware/auth';
import { db } from '../models/database';
import { v4 as uuidv4 } from 'uuid';
import { initializeUserPermissions } from '../services/permissions';
import crypto from 'crypto';

const router = Router();
const ACCESS_TOKEN_TTL_MINUTES = parseInt(process.env.ACCESS_TOKEN_TTL_MINUTES || '15', 10);
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30', 10);
const ACCESS_TOKEN_MAX_AGE = ACCESS_TOKEN_TTL_MINUTES * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

function getFrontendUrl(): string {
  const fallback = 'https://staff.ahscampus.com';
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

function toMySqlTimestamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('session', accessToken, { ...cookieOptions(), maxAge: ACCESS_TOKEN_MAX_AGE });
  res.cookie('refresh', refreshToken, { ...cookieOptions(), maxAge: REFRESH_TOKEN_MAX_AGE });
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
    // Exchange code for Discord access token
    const discordAccessToken = await exchangeDiscordCode(code);
    if (!discordAccessToken) {
      return res.redirect(`${getFrontendUrl()}/login?error=token_exchange_failed`);
    }

    // Get Discord user info
    const discordUser = await getDiscordUser(discordAccessToken);
    if (!discordUser) {
      return res.redirect(`${getFrontendUrl()}/login?error=user_fetch_failed`);
    }

    // Find or create user
    let user = await db
      .prepare('SELECT * FROM users WHERE discord_id = ?')
      .get(discordUser.id) as any;

    if (!user) {
      // Create new user with avatar
      const insertResult = await db
        .prepare('INSERT INTO users (discord_id, discord_username, discord_avatar, status) VALUES (?, ?, ?, ?)')
        .run(discordUser.id, discordUser.username, discordUser.avatar, 'pending_verification') as any;
      
      if (!insertResult || !insertResult.lastInsertRowid) {
        throw new Error('Failed to create user');
      }
      
      // Fetch the newly created user
      user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(insertResult.lastInsertRowid) as any;
    } else {
      // Update username and avatar if changed
      await db.prepare('UPDATE users SET discord_username = ?, discord_avatar = ? WHERE id = ?').run(
        discordUser.username,
        discordUser.avatar,
        user.id
      );
      // Refetch user to get updated data
      user = await db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any;
    }

    // Create session (short-lived access token + longer refresh token)
    const sessionId = uuidv4();
    const accessToken = generateToken(user.id, user.discord_id, user.rank);
    const refreshToken = generateRefreshToken();
    const accessExpiresAt = new Date(Date.now() + ACCESS_TOKEN_MAX_AGE);
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);
    const mysqlAccessExpiresAt = toMySqlTimestamp(accessExpiresAt);
    const mysqlRefreshExpiresAt = toMySqlTimestamp(refreshExpiresAt);

    // Delete old sessions and create new one
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    const sessionInsertResult = await db.prepare(
      'INSERT INTO sessions (id, user_id, token, expires_at, refresh_token, refresh_expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(sessionId, user.id, accessToken, mysqlAccessExpiresAt, refreshToken, mysqlRefreshExpiresAt);
    
    // Verify session was created
    const verifySession = await db
      .prepare('SELECT * FROM sessions WHERE token = ?')
      .get(accessToken) as any;
    
    if (!verifySession) {
      console.error('Failed to create session - session not found after insert');
      throw new Error('Failed to create session');
    }
    
    // Set httpOnly cookies as transport for both access and refresh tokens.
    setAuthCookies(res, accessToken, refreshToken);

    // Initialize permissions if user just verified Roblox
    if (user.status === 'active' && user.rank !== null) {
      await initializeUserPermissions(user.id, user.rank);
    }

    // Redirect to frontend with token in fragment (prevents referrer/header leakage)
    res.redirect(
      `${getFrontendUrl()}/auth/callback?token=${encodeURIComponent(accessToken)}`
    );
  } catch (error) {
    console.error('Discord OAuth error:', error);
    res.redirect(`${getFrontendUrl()}/login?error=server_error`);
  }
});

/**
 * Get current user profile with verification status
 * This is the single source of truth for frontend auth state
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

  // Compute verification status on backend - frontend should NOT compute this
  const isDiscordVerified = !!user.discord_id;
  const isRobloxVerified = !!user.roblox_id;
  const isActive = user.status === 'active';
  const hasRank = user.rank !== null;
  
  // Full verification requires ALL conditions
  const isFullyVerified = isDiscordVerified && isRobloxVerified && isActive && hasRank;

  // Determine what verification step is needed (if any)
  let verificationStep: string | null = null;
  if (!isDiscordVerified) {
    verificationStep = 'discord';
  } else if (!isRobloxVerified) {
    verificationStep = 'roblox';
  } else if (!isActive) {
    verificationStep = 'activation';
  } else if (!hasRank) {
    verificationStep = 'rank';
  }

  res.json({
    id: user.id,
    discord_id: user.discord_id,
    discord_username: user.discord_username,
    discord_avatar: user.discord_avatar || null,
    roblox_id: user.roblox_id,
    roblox_username: user.roblox_username,
    rank: user.rank,
    rank_name: user.rank_name,
    status: user.status,
    created_at: user.created_at,
    // New verification fields - single source of truth
    verification: {
      discord: isDiscordVerified,
      roblox: isRobloxVerified,
      active: isActive,
      rank: hasRank,
      complete: isFullyVerified,
      next_step: verificationStep,
    },
  });
});

/**
 * Rotate access/refresh tokens using the refresh token cookie
 */
router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = (req as any)?.cookies?.refresh as string | undefined;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    const session = await db
      .prepare('SELECT * FROM sessions WHERE refresh_token = ? AND refresh_expires_at > NOW()')
      .get(refreshToken) as any;

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await db
      .prepare('SELECT id, discord_id, discord_username, `rank`, status FROM users WHERE id = ?')
      .get(session.user_id) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newAccessToken = generateToken(user.id, user.discord_id, user.rank);
    const newRefreshToken = generateRefreshToken();
    const accessExpiresAt = new Date(Date.now() + ACCESS_TOKEN_MAX_AGE);
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);

    await db.prepare(
      'UPDATE sessions SET token = ?, expires_at = ?, refresh_token = ?, refresh_expires_at = ? WHERE id = ?'
    ).run(
      newAccessToken,
      toMySqlTimestamp(accessExpiresAt),
      newRefreshToken,
      toMySqlTimestamp(refreshExpiresAt),
      session.id
    );

    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.json({ token: newAccessToken, expires_in: ACCESS_TOKEN_MAX_AGE / 1000 });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh session' });
  }
});

/**
 * Logout - clears session from DB and cookies
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Use the session token that was resolved during authentication
  // This handles both Bearer token and cookie-based sessions
  if (req.sessionToken) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').run(req.sessionToken);
  }
  const refreshToken = (req as any)?.cookies?.refresh;
  if (refreshToken) {
    await db.prepare('DELETE FROM sessions WHERE refresh_token = ?').run(refreshToken);
  }
  
  // Clear the session cookie
  res.clearCookie('session', cookieOptions());
  res.clearCookie('refresh', cookieOptions());

  res.json({ message: 'Logged out successfully' });
});

export default router;
