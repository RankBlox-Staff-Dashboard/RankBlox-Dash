import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { verifyRobloxUser } from '../services/roblox';
import { dbGet, dbRun } from '../utils/db-helpers';
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

  try {
    // Check if user already has an active verification code
    const existing = await dbGet<any>(
      'SELECT * FROM verification_codes WHERE user_id = $1 AND used = false AND expires_at > NOW()',
      [req.user.id]
    );

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

    await dbRun(
      'INSERT INTO verification_codes (user_id, emoji_code, expires_at, used) VALUES ($1, $2, $3, $4)',
      [req.user.id, emojiCode, expiresAt.toISOString(), false]
    );

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

  const { roblox_username, emoji_code } = req.body;

  if (!roblox_username || !emoji_code) {
    return res.status(400).json({ error: 'roblox_username and emoji_code are required' });
  }

  try {
    // Find active verification code
    const codeRecord = await dbGet<any>(
      'SELECT * FROM verification_codes WHERE user_id = $1 AND emoji_code = $2 AND used = false AND expires_at > NOW()',
      [req.user.id, emoji_code]
    );

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
    await dbRun(
      `UPDATE users 
       SET roblox_id = $1, roblox_username = $2, rank = $3, rank_name = $4, status = 'active', updated_at = NOW()
       WHERE id = $5`,
      [
        verificationResult.userId.toString(),
        verificationResult.username,
        verificationResult.rank,
        verificationResult.rankName,
        req.user.id
      ]
    );

    // Mark verification code as used
    await dbRun('UPDATE verification_codes SET used = true WHERE id = $1', [codeRecord.id]);

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

  try {
    const user = await dbGet<any>(
      'SELECT roblox_id, roblox_username, rank, rank_name, status FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      verified: user.roblox_id !== null,
      roblox_username: user.roblox_username,
      rank: user.rank,
      rank_name: user.rank_name,
      status: user.status,
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({ error: 'Failed to fetch verification status' });
  }
});

export default router;
