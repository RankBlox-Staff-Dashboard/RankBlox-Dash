import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { verifyRobloxUser } from '../services/roblox';
import { db } from '../models/database';
import { initializeUserPermissions } from '../services/permissions';

const router = Router();

// All verification routes require authentication
router.use(authenticateToken);

// Emoji pool for generating verification codes
const EMOJIS = ['🎮', '🔥', '⚡', '⭐', '💎', '🚀', '🌟', '🎯', '💫', '🎪', '🎨', '🎭', '🎬', '🎸', '🎺'];

/**
 * Generate a random emoji code (3-5 emojis)
 */
function generateEmojiCode(): string {
  const count = Math.floor(Math.random() * 3) + 3; // 3-5 emojis
  const selected: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    selected.push(randomEmoji);
  }
  
  return selected.join('');
}

/**
 * Request a Roblox verification code
 */
router.post('/roblox/request', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.status === 'inactive') {
    return res.status(403).json({ error: 'Account is inactive' });
  }

  try {
    // Check if user already has an active verification code
    const existing = await db
      .prepare(
        'SELECT * FROM verification_codes WHERE user_id = ? AND used = false AND expires_at > NOW()'
      )
      .get(req.user.id) as any;

    if (existing) {
      return res.json({
        emoji_code: existing.emoji_code,
        expires_at: existing.expires_at,
        message: 'Use this emoji code in your Roblox bio/status',
      });
    }

    // Generate new verification code
    const emojiCode = generateEmojiCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes expiry
    
    // Format datetime for MySQL (YYYY-MM-DD HH:MM:SS)
    const mysqlDateTime = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    await db.prepare(
      'INSERT INTO verification_codes (user_id, emoji_code, expires_at, used) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, emojiCode, mysqlDateTime, false);

    res.json({
      emoji_code: emojiCode,
      expires_at: expiresAt.toISOString(),
      message: 'Place this emoji code in your Roblox bio or status, then click verify',
    });
  } catch (error) {
    console.error('Error generating verification code:', error);
    res.status(500).json({ error: 'Failed to generate verification code' });
  }
});

/**
 * Verify Roblox account with emoji code
 */
router.post('/roblox/verify', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.status === 'inactive') {
    return res.status(403).json({ error: 'Account is inactive' });
  }

  const { roblox_username, emoji_code } = req.body;

  if (!roblox_username || !emoji_code) {
    return res.status(400).json({ error: 'roblox_username and emoji_code are required' });
  }
  if (typeof roblox_username !== 'string' || typeof emoji_code !== 'string') {
    return res.status(400).json({ error: 'roblox_username and emoji_code must be strings' });
  }
  // Roblox usernames are 3-20 chars, alphanumeric + underscore
  if (!/^[A-Za-z0-9_]{3,20}$/.test(roblox_username)) {
    return res.status(400).json({ error: 'Invalid roblox_username format' });
  }
  if (emoji_code.length < 1 || emoji_code.length > 64) {
    return res.status(400).json({ error: 'Invalid emoji_code' });
  }

  try {
    // Find active verification code
    const codeRecord = await db
      .prepare(
        'SELECT * FROM verification_codes WHERE user_id = ? AND emoji_code = ? AND used = false AND expires_at > NOW()'
      )
      .get(req.user.id, emoji_code) as any;

    if (!codeRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Verify Roblox user
    const verificationResult = await verifyRobloxUser(roblox_username, emoji_code);

    if (!verificationResult) {
      return res.status(400).json({
        error: 'Verification failed. Make sure the emoji code is in your Roblox bio/status and you are a member of the group.',
      });
    }

    // Update user with Roblox info
    // Note: `rank` must be escaped with backticks because it's a MySQL reserved keyword
    await db.prepare(
      `UPDATE users 
       SET roblox_id = ?, roblox_username = ?, \`rank\` = ?, rank_name = ?, status = 'active', updated_at = NOW()
       WHERE id = ?`
    ).run(
      verificationResult.userId.toString(),
      verificationResult.username,
      verificationResult.rank,
      verificationResult.rankName,
      req.user.id
    );

    // Mark verification code as used
    await db.prepare('UPDATE verification_codes SET used = true WHERE id = ?').run(codeRecord.id);

    // Initialize permissions
    await initializeUserPermissions(req.user.id, verificationResult.rank);

    res.json({
      message: 'Verification successful',
      roblox_username: verificationResult.username,
      rank: verificationResult.rank,
      rank_name: verificationResult.rankName,
    });
  } catch (error) {
    console.error('Error verifying Roblox account:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * Check verification status
 */
router.get('/roblox/status', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Note: `rank` must be escaped with backticks because it's a MySQL reserved keyword
  const user = await db
    .prepare('SELECT roblox_id, roblox_username, `rank`, rank_name, status FROM users WHERE id = ?')
    .get(req.user.id) as any;

  res.json({
    verified: user.roblox_id !== null,
    roblox_username: user.roblox_username,
    rank: user.rank,
    rank_name: user.rank_name,
    status: user.status,
  });
});

export default router;

