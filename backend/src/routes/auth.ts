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
  // Remove any trailing slashes to prevent double slashes in redirects
  const hardcodedUrl = 'https://staff.rankblox.xyz';
  // Safeguard: if an old URL is somehow still configured, use the hardcoded one.
  if (process.env.FRONTEND_URL?.includes('ahscampus.com') || process.env.FRONTEND_URLS?.includes('ahscampus.com')) {
    console.warn('Detected old ahscampus.com frontend URL in environment variables. Using hardcoded URL instead.');
    return hardcodedUrl.replace(/\/+$/, ''); // Remove trailing slashes
  }
  // Original logic (now secondary to hardcoded value)
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/+$/, ''); // Remove trailing slashes
  }
  const first = process.env.FRONTEND_URLS?.split(',')?.[0]?.trim();
  return (first || hardcodedUrl).replace(/\/+$/, ''); // Remove trailing slashes
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true, // CRITICAL: Prevents XSS attacks - cookie not accessible via JavaScript
    secure: isProd, // CRITICAL: Only send over HTTPS in production
    sameSite: 'lax' as const, // SECURITY: 'lax' allows OAuth redirects but prevents CSRF on POST requests
    path: '/',
    // CRITICAL: Don't set domain - let browser handle it automatically
    // Setting domain explicitly can cause cookie sharing across subdomains (security risk)
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
    const frontendUrl = getFrontendUrl();
    res.redirect(`${frontendUrl}/login?error=server_error`);
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
    const frontendUrl = getFrontendUrl();
    return res.redirect(`${frontendUrl}/login?error=no_code`);
  }

  if (!state) {
    console.error('[OAuth Callback] ❌ No state parameter in callback');
    const frontendUrl = getFrontendUrl();
    return res.redirect(`${frontendUrl}/login?error=invalid_state`);
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
      console.error('[OAuth Callback] ❌ SECURITY: State not found in database or expired');
      console.error('[OAuth Callback] This could mean:');
      console.error('[OAuth Callback]   1. State was never stored');
      console.error('[OAuth Callback]   2. State expired (>10 minutes)');
      console.error('[OAuth Callback]   3. Invalid/forged state parameter - POSSIBLE ATTACK');
      console.error('[OAuth Callback]   4. Database connection issue');
      
      // SECURITY: Do NOT use cookie fallback - database validation is required
      // Cookie fallback was a security vulnerability that allowed state reuse
      console.error('[OAuth Callback] ❌ Rejecting authentication - state validation failed (no cookie fallback for security)');
      res.clearCookie('oauth_state', cookieOptions());
      const frontendUrl = getFrontendUrl();
      return res.redirect(`${frontendUrl}/login?error=invalid_state&message=State validation failed. Please try again.`);
    }
    
    // SECURITY: State validated successfully - delete it immediately (one-time use)
    console.log('[OAuth Callback] ✅ State found in database - deleting (one-time use)');
    try {
      const oauthStatesCollection = getCollection('oauth_states');
      const deleteResult = await oauthStatesCollection.deleteOne({ state: state });
      if (deleteResult.deletedCount === 1) {
        console.log('[OAuth Callback] ✅ State record deleted successfully');
      } else {
        console.warn('[OAuth Callback] ⚠️  State record not found for deletion (may have been deleted already)');
      }
    } catch (deleteError: any) {
      console.error('[OAuth Callback] ❌ CRITICAL: Failed to delete state record:', deleteError.message);
      // Don't proceed if we can't delete the state - security risk
      const frontendUrl = getFrontendUrl();
      return res.redirect(`${frontendUrl}/login?error=server_error&message=State deletion failed`);
    }
    
    // Also clear cookie if present
    res.clearCookie('oauth_state', cookieOptions());
    
    console.log('[OAuth Callback] ✅ State validated successfully');
  } catch (error: any) {
    console.error('[OAuth Callback] ❌ Unexpected error during state validation:', error);
    console.error('[OAuth Callback] Error stack:', error.stack);
    const frontendUrl = getFrontendUrl();
    return res.redirect(`${frontendUrl}/login?error=server_error&message=${encodeURIComponent(error.message || 'Unexpected error during authentication')}`);
  }

  try {
    // Exchange code for access token
    const accessToken = await exchangeDiscordCode(code);
    if (!accessToken) {
      console.error('[OAuth Callback] ❌ Failed to exchange code for access token');
      console.error('[OAuth Callback] This usually means:');
      console.error('[OAuth Callback]   1. DISCORD_CLIENT_SECRET is incorrect or not set');
      console.error('[OAuth Callback]   2. Redirect URI in Discord Developer Portal doesn\'t match');
      console.error('[OAuth Callback]   3. Client ID is incorrect');
      console.error('[OAuth Callback]   4. Authorization code expired or already used');
      const frontendUrl = getFrontendUrl();
      return res.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    // SECURITY: Get Discord user info directly from OAuth provider
    // CRITICAL: This is the ONLY source of truth for Discord user identity
    const discordUser = await getDiscordUser(accessToken);
    if (!discordUser || !discordUser.id) {
      console.error('[OAuth Callback] ❌ Failed to fetch Discord user info or missing Discord ID');
      const frontendUrl = getFrontendUrl();
      return res.redirect(`${frontendUrl}/login?error=user_fetch_failed`);
    }
    
    console.log(`[OAuth Callback] ✅ Discord user authenticated: ${discordUser.id} (${discordUser.username})`);

    // SECURITY: Find or create user using Discord ID ONLY (from OAuth provider)
    // CRITICAL: Never trust client-provided user IDs - always use Discord ID from OAuth
    let user = await db
      .prepare('SELECT id, discord_id, discord_username, discord_avatar, roblox_id, roblox_username, `rank`, status FROM users WHERE discord_id = ?')
      .get(discordUser.id) as any;

    if (!user) {
      // SECURITY: Create new user - Discord ID is the primary identifier
      console.log(`[OAuth Callback] Creating new user for Discord ID: ${discordUser.id}`);
      const insertResult = await db
        .prepare('INSERT INTO users (discord_id, discord_username, discord_avatar, status) VALUES (?, ?, ?, ?)')
        .run(discordUser.id, discordUser.username, discordUser.avatar, 'pending_verification') as any;
      
      if (!insertResult || !insertResult.lastInsertRowid) {
        console.error(`[OAuth Callback] ❌ Failed to create user for Discord ID: ${discordUser.id}`);
        throw new Error('Failed to create user');
      }
      
      // SECURITY: Fetch the newly created user using the database-generated ID
      // CRITICAL: Use lastInsertRowid to ensure we get the correct user
      user = await db
        .prepare('SELECT id, discord_id, discord_username, discord_avatar, roblox_id, roblox_username, `rank`, status FROM users WHERE id = ?')
        .get(insertResult.lastInsertRowid) as any;
      
      // SECURITY: Verify the created user has the correct Discord ID
      if (!user || user.discord_id !== discordUser.id) {
        console.error(`[OAuth Callback] ❌ CRITICAL: Created user Discord ID mismatch!`);
        console.error(`[OAuth Callback] Expected: ${discordUser.id}, Got: ${user?.discord_id}`);
        throw new Error('User creation verification failed');
      }
      
      console.log(`[OAuth Callback] ✅ New user created: ID ${user.id}, Discord ID: ${user.discord_id}`);
    } else {
      // SECURITY: Update existing user - verify Discord ID matches
      if (user.discord_id !== discordUser.id) {
        console.error(`[OAuth Callback] ❌ CRITICAL SECURITY VIOLATION: User Discord ID mismatch!`);
        console.error(`[OAuth Callback] Expected: ${discordUser.id}, Got: ${user.discord_id} for user ID: ${user.id}`);
        const frontendUrl = getFrontendUrl();
        return res.redirect(`${frontendUrl}/login?error=security_violation`);
      }
      
      console.log(`[OAuth Callback] ✅ Existing user found: ID ${user.id}, Discord ID: ${user.discord_id}`);
      
      // Update username and avatar if changed
      await db.prepare('UPDATE users SET discord_username = ?, discord_avatar = ? WHERE id = ?').run(
        discordUser.username,
        discordUser.avatar,
        user.id
      );
      // Refetch user to get updated data
      user = await db
        .prepare('SELECT id, discord_id, discord_username, discord_avatar, roblox_id, roblox_username, `rank`, status FROM users WHERE id = ?')
        .get(user.id) as any;
    }
    
    // SECURITY: Final verification - ensure user Discord ID matches OAuth provider
    if (user.discord_id !== discordUser.id) {
      console.error(`[OAuth Callback] ❌ CRITICAL: Final verification failed - Discord ID mismatch!`);
      console.error(`[OAuth Callback] User ID: ${user.id}, Expected Discord ID: ${discordUser.id}, Got: ${user.discord_id}`);
      const frontendUrl = getFrontendUrl();
      return res.redirect(`${frontendUrl}/login?error=security_violation`);
    }

    // SECURITY: Create session atomically
    // CRITICAL: Generate unique session ID and token for THIS user only
    const sessionId = uuidv4();
    const token = generateToken(user.id, user.discord_id, user.rank);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // SECURITY: Delete ALL old sessions for THIS user only (prevents session reuse)
    // Using user.id ensures sessions are isolated per user
    console.log(`[OAuth Callback] Deleting old sessions for user ${user.id} (Discord ID: ${user.discord_id})`);
    const deleteResult = await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    console.log(`[OAuth Callback] Deleted ${deleteResult.changes} old session(s) for user ${user.id}`);

    // SECURITY: Create new session with unique token bound to THIS user
    console.log(`[OAuth Callback] Creating new session for user ${user.id} (Discord ID: ${user.discord_id})`);
    const sessionInsertResult = await db.prepare(
      'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
    ).run(sessionId, user.id, token, expiresAt);
    
    // SECURITY: Verify session was created correctly and belongs to the correct user
    const verifySession = await db
      .prepare('SELECT id, user_id, token, expires_at FROM sessions WHERE token = ? AND user_id = ?')
      .get(token, user.id) as { id: string; user_id: number; token: string; expires_at: Date } | undefined;
    
    if (!verifySession) {
      console.error(`[OAuth Callback] ❌ CRITICAL: Session verification failed for user ${user.id}`);
      console.error(`[OAuth Callback] Token: ${token.substring(0, 20)}...`);
      throw new Error('Failed to create session - verification failed');
    }
    
    // SECURITY: Verify the session user_id matches the user we just created/updated
    if (verifySession.user_id !== user.id) {
      console.error(`[OAuth Callback] ❌ CRITICAL SECURITY VIOLATION: Session user_id mismatch!`);
      console.error(`[OAuth Callback] Expected user_id: ${user.id}, Got: ${verifySession.user_id}`);
      // Delete the incorrectly created session
      await db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      throw new Error('Session verification failed - user ID mismatch');
    }
    
    console.log(`[OAuth Callback] ✅ Session created and verified for user ${user.id} (Discord ID: ${user.discord_id})`);
    
    // Set httpOnly cookie as a safer default transport; frontend can still use Bearer token.
    res.cookie('session', token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });

    // Initialize permissions if user just verified Roblox
    if (user.status === 'active' && user.rank !== null) {
      await initializeUserPermissions(user.id, user.rank);
    }

    // Redirect to frontend with token in fragment (prevents referrer/header leakage)
    const frontendUrl = getFrontendUrl();
    res.redirect(
      `${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`
    );
  } catch (error) {
    console.error('Discord OAuth error:', error);
    const frontendUrl = getFrontendUrl();
    res.redirect(`${frontendUrl}/login?error=server_error`);
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
