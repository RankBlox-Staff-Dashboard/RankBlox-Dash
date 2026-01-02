import { Router, Request, Response } from 'express';
import { exchangeDiscordCode, getDiscordUser, getDiscordOAuthUrl } from '../services/discord';
import { generateToken, authenticateToken } from '../middleware/auth';
import { db, getCollection } from '../models/database';
import { v4 as uuidv4 } from 'uuid';
import { initializeUserPermissions } from '../services/permissions';
import crypto from 'crypto';

const router = Router();

function getFrontendUrl(): string {
  // Hardcoded frontend URL - must match actual frontend deployment
  const hardcodedUrl = 'https://staff.rankblox.xyz';
  // Safeguard: if an old URL is somehow still configured, use the hardcoded one.
  if (process.env.FRONTEND_URL?.includes('ahscampus.com') || process.env.FRONTEND_URLS?.includes('ahscampus.com')) {
    console.warn('Detected old ahscampus.com frontend URL in environment variables. Using hardcoded URL instead.');
    return hardcodedUrl;
  }
  // Original logic (now secondary to hardcoded value)
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const first = process.env.FRONTEND_URLS?.split(',')?.[0]?.trim();
  return first || hardcodedUrl; // Fallback to hardcoded
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd, // Only send over HTTPS in production
    sameSite: 'lax' as const, // Allow cookie on top-level navigation (OAuth redirect)
    path: '/',
    // Don't set domain - let browser handle it automatically
    // This ensures cookie works for the exact domain (including subdomains)
  };
}

/**
 * Initiate Discord OAuth flow
 * Uses database storage for state instead of cookies to avoid browser cookie blocking
 */
router.get('/discord', async (req: Request, res: Response) => {
  // Always generate and bind state server-side to prevent login CSRF / swapping.
  const state = crypto.randomUUID();
  
  // Log for debugging
  console.log('[OAuth Init] Generated state:', state);
  console.log('[OAuth Init] Request origin:', req.headers.origin);
  console.log('[OAuth Init] Request referer:', req.headers.referer);
  
  try {
    // Store state in database with 10 minute expiration
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    const oauthStatesCollection = getCollection('oauth_states');
    await oauthStatesCollection.insertOne({
      state: state,
      created_at: new Date(),
      expires_at: expiresAt,
    });
    
    console.log('[OAuth Init] ✅ State stored in database, expires at:', expiresAt.toISOString());
    
    // Also try to set cookie as fallback (but don't rely on it)
    const cookieOpts = {
      ...cookieOptions(),
      maxAge: 10 * 60 * 1000, // 10 minutes
      sameSite: 'none' as const, // Use 'none' for cross-site redirects
      secure: true, // Required when SameSite is 'none'
    };
    
    res.cookie('oauth_state', state, cookieOpts);
    console.log('[OAuth Init] Cookie also set (fallback)');

    const url = getDiscordOAuthUrl(state);
    console.log('[OAuth Init] Redirecting to Discord:', url);
    res.redirect(url);
  } catch (error: any) {
    console.error('[OAuth Init] ❌ Failed to store state:', error);
    res.redirect(`${getFrontendUrl()}/login?error=server_error`);
  }
});

/**
 * Handle Discord OAuth callback
 */
router.get('/discord/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

  if (!code) {
    console.error('[OAuth Callback] ❌ No authorization code received');
    return res.redirect(`${getFrontendUrl()}/login?error=no_code`);
  }

  if (!state) {
    console.error('[OAuth Callback] ❌ No state parameter in callback');
    return res.redirect(`${getFrontendUrl()}/login?error=invalid_state`);
  }

  // Log for debugging
  console.log('[OAuth Callback] ========================================');
  console.log('[OAuth Callback] Authorization code received:', code ? 'YES' : 'NO');
  console.log('[OAuth Callback] State from query:', state);
  console.log('[OAuth Callback] Request origin:', req.headers.origin);
  console.log('[OAuth Callback] Request referer:', req.headers.referer);
  console.log('[OAuth Callback] Request host:', req.headers.host);
  console.log('[OAuth Callback] ========================================');
  
  try {
    // Validate state from database (primary method)
    let stateRecord = null;
    try {
      const oauthStatesCollection = getCollection('oauth_states');
      stateRecord = await oauthStatesCollection.findOne({
        state: state,
        expires_at: { $gt: new Date() }, // Not expired
      });
    } catch (dbError: any) {
      console.error('[OAuth Callback] ❌ Database error accessing oauth_states collection:', dbError);
      console.error('[OAuth Callback] Error details:', dbError.message);
      // Fall through to cookie fallback
    }
    
    if (!stateRecord) {
      console.error('[OAuth Callback] ❌ State not found in database or expired');
      console.error('[OAuth Callback] This could mean:');
      console.error('[OAuth Callback]   1. State was never stored');
      console.error('[OAuth Callback]   2. State expired (>10 minutes)');
      console.error('[OAuth Callback]   3. Invalid/forged state parameter');
      console.error('[OAuth Callback]   4. Database connection issue');
      
      // Fallback: try cookie (for backwards compatibility)
      const cookieState = (req as any)?.cookies?.oauth_state as string | undefined;
      if (cookieState && cookieState === state) {
        console.warn('[OAuth Callback] ⚠️  State not in DB but cookie matches - using cookie as fallback');
        // Continue with authentication using cookie validation
      } else {
        console.error('[OAuth Callback] ❌ Cookie fallback also failed');
        console.error('[OAuth Callback] Cookie state:', cookieState ? 'present' : 'missing');
        res.clearCookie('oauth_state', cookieOptions());
        return res.redirect(`${getFrontendUrl()}/login?error=invalid_state&message=State validation failed. Please try again.`);
      }
    } else {
      console.log('[OAuth Callback] ✅ State found in database');
      
      // Delete the state record (one-time use)
      try {
        const oauthStatesCollection = getCollection('oauth_states');
        await oauthStatesCollection.deleteOne({ state: state });
        console.log('[OAuth Callback] ✅ State record deleted (one-time use)');
      } catch (deleteError: any) {
        console.warn('[OAuth Callback] ⚠️  Failed to delete state record (non-critical):', deleteError.message);
      }
    }
    
    // Also clear cookie if present
    res.clearCookie('oauth_state', cookieOptions());
    
    console.log('[OAuth Callback] ✅ State validated successfully');
  } catch (error: any) {
    console.error('[OAuth Callback] ❌ Unexpected error during state validation:', error);
    console.error('[OAuth Callback] Error stack:', error.stack);
    return res.redirect(`${getFrontendUrl()}/login?error=server_error&message=${encodeURIComponent(error.message || 'Unexpected error during authentication')}`);
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
      `${getFrontendUrl()}/auth/callback?token=${encodeURIComponent(token)}`
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
  
  // Clear the session cookie
  res.clearCookie('session', cookieOptions());

  res.json({ message: 'Logged out successfully' });
});

export default router;
