import axios from 'axios';

const ROBLOX_GROUP_ID = process.env.ROBLOX_GROUP_ID || '32350433';

interface RobloxUser {
  id: number;
  name: string;
  displayName: string;
}

interface RobloxGroupMember {
  user: RobloxUser;
  role: {
    id: number;
    name: string;
    rank: number;
  };
}

function normalizeEmojiText(input: string): string {
  // Roblox/user agents sometimes add/remove emoji variation selectors.
  // Stripping them makes comparisons more reliable.
  return (input || '').normalize('NFKC').replace(/[\uFE0E\uFE0F]/g, '');
}

function containsAnyEmoji(input: string): boolean {
  // Unicode emoji coverage: Extended_Pictographic catches most emoji glyphs.
  // This is supported in Node 20+ (and our TS target is ES2020).
  return /\p{Extended_Pictographic}/u.test(input || '');
}

/**
 * Get Roblox user ID by username
 */
export async function getRobloxUserId(username: string): Promise<number | null> {
  try {
    const response = await axios.get(`https://users.roblox.com/v1/usernames/users`, {
      params: { usernames: [username], excludeBannedUsers: false },
    });

    if (response.data.data && response.data.data.length > 0) {
      return response.data.data[0].id;
    }

    return null;
  } catch (error) {
    console.error('Error fetching Roblox user ID:', error);
    return null;
  }
}

/**
 * Get Roblox user info by ID
 */
export async function getRobloxUser(userId: number): Promise<RobloxUser | null> {
  try {
    const response = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
    return response.data as RobloxUser;
  } catch (error) {
    console.error('Error fetching Roblox user:', error);
    return null;
  }
}

/**
 * Get user's bio/description
 */
export async function getRobloxUserBio(userId: number): Promise<string> {
  try {
    const response = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
    const user = response.data as RobloxUser & { description?: string };
    return user.description || '';
  } catch (error) {
    console.error('Error fetching Roblox user bio:', error);
    return '';
  }
}

/**
 * Check if user is in the group and get their rank
 */
export async function getUserGroupRank(userId: number): Promise<{ rank: number; rankName: string } | null> {
  try {
    // Get user's groups/roles
    const response = await axios.get(
      `https://groups.roblox.com/v1/users/${userId}/groups/roles`
    );

    const groups = response.data.data as any[];
    
    // Find the group that matches our group ID
    const groupMember = groups.find((g: any) => {
      return g.group && g.group.id === parseInt(ROBLOX_GROUP_ID);
    });

    if (!groupMember || !groupMember.role) {
      return null;
    }

    return {
      rank: groupMember.role.rank,
      rankName: groupMember.role.name,
    };
  } catch (error) {
    console.error('Error fetching user group rank:', error);
    return null;
  }
}

/**
 * Verify emoji code exists in user's bio/description
 */
export async function verifyEmojiCodeInBio(userId: number, emojiCode: string): Promise<boolean> {
  try {
    const bio = await getRobloxUserBio(userId);
    if (!containsAnyEmoji(bio)) {
      return false;
    }
    return normalizeEmojiText(bio).includes(normalizeEmojiText(emojiCode));
  } catch (error) {
    console.error('Error verifying emoji code in bio:', error);
    return false;
  }
}

export type RobloxVerificationFailureReason =
  | 'USER_NOT_FOUND'
  | 'NO_EMOJI_IN_BIO'
  | 'CODE_NOT_FOUND'
  | 'NOT_IN_GROUP'
  | 'ROBLOX_API_ERROR';

export type RobloxVerificationResult =
  | { ok: true; userId: number; username: string; rank: number; rankName: string }
  | { ok: false; reason: RobloxVerificationFailureReason };

/**
 * Verify user by username and emoji code, with explicit failure reasons.
 */
export async function verifyRobloxUserDetailed(
  username: string,
  emojiCode: string
): Promise<RobloxVerificationResult> {
  const userId = await getRobloxUserId(username);
  if (!userId) {
    return { ok: false, reason: 'USER_NOT_FOUND' };
  }

  const bio = await getRobloxUserBio(userId);
  if (!containsAnyEmoji(bio)) {
    return { ok: false, reason: 'NO_EMOJI_IN_BIO' };
  }

  const normalizedBio = normalizeEmojiText(bio);
  const normalizedCode = normalizeEmojiText(emojiCode);
  if (!normalizedBio.includes(normalizedCode)) {
    return { ok: false, reason: 'CODE_NOT_FOUND' };
  }

  const rankInfo = await getUserGroupRank(userId);
  if (!rankInfo) {
    return { ok: false, reason: 'NOT_IN_GROUP' };
  }

  const userInfo = await getRobloxUser(userId);
  if (!userInfo) {
    return { ok: false, reason: 'ROBLOX_API_ERROR' };
  }

  return {
    ok: true,
    userId,
    username: userInfo.name || username,
    rank: rankInfo.rank,
    rankName: rankInfo.rankName,
  };
}

/**
 * Verify user by username and emoji code
 * Returns user info and rank if verification succeeds
 */
export async function verifyRobloxUser(
  username: string,
  emojiCode: string
): Promise<{ userId: number; username: string; rank: number; rankName: string } | null> {
  const result = await verifyRobloxUserDetailed(username, emojiCode);
  return result.ok
    ? {
        userId: result.userId,
        username: result.username,
        rank: result.rank,
        rankName: result.rankName,
      }
    : null;
}

