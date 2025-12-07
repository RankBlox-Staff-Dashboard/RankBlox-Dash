import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import type { RobloxUserInfo, RobloxAvatarInfo } from "../types/index.js";

const ROBLOX_API_BASE = "https://users.roblox.com/v1";
const ROBLOX_AVATAR_API = "https://thumbnails.roblox.com/v1";

interface RobloxApiError {
  errors: Array<{
    code: number;
    message: string;
    userFacingMessage?: string;
  }>;
}

/**
 * Roblox API Service
 * Handles all interactions with Roblox APIs for user verification
 */
export class RobloxService {
  /**
   * Get user info by username
   */
  async getUserByUsername(username: string): Promise<RobloxUserInfo | null> {
    try {
      const response = await fetch(`${ROBLOX_API_BASE}/usernames/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usernames: [username],
          excludeBannedUsers: false,
        }),
      });

      if (!response.ok) {
        logger.error("Roblox API error", { status: response.status, username });
        return null;
      }

      const data = await response.json() as { data: Array<{ requestedUsername: string; id: number }> };
      
      if (!data.data || data.data.length === 0) {
        logger.debug("Roblox user not found", { username });
        return null;
      }

      const userId = data.data[0].id;
      return this.getUserById(userId);
    } catch (error) {
      logger.error("Failed to fetch Roblox user by username", { username, error: String(error) });
      return null;
    }
  }

  /**
   * Get user info by user ID
   */
  async getUserById(userId: number): Promise<RobloxUserInfo | null> {
    try {
      const response = await fetch(`${ROBLOX_API_BASE}/users/${userId}`);

      if (!response.ok) {
        if (response.status === 404) {
          logger.debug("Roblox user not found", { userId });
          return null;
        }
        logger.error("Roblox API error", { status: response.status, userId });
        return null;
      }

      const data = await response.json() as RobloxUserInfo;
      return data;
    } catch (error) {
      logger.error("Failed to fetch Roblox user by ID", { userId, error: String(error) });
      return null;
    }
  }

  /**
   * Get user avatar thumbnail URL
   */
  async getUserAvatar(userId: number, size: string = "150x150"): Promise<string | null> {
    try {
      const response = await fetch(
        `${ROBLOX_AVATAR_API}/users/avatar-headshot?userIds=${userId}&size=${size}&format=Png&isCircular=false`
      );

      if (!response.ok) {
        logger.error("Roblox Avatar API error", { status: response.status, userId });
        return null;
      }

      const data = await response.json() as { data: RobloxAvatarInfo[] };
      
      if (!data.data || data.data.length === 0) {
        return null;
      }

      return data.data[0].imageUrl;
    } catch (error) {
      logger.error("Failed to fetch Roblox avatar", { userId, error: String(error) });
      return null;
    }
  }

  /**
   * Validate that a username exists and get full user info
   */
  async validateUsername(username: string): Promise<{
    valid: boolean;
    user: RobloxUserInfo | null;
    avatarUrl: string | null;
    error?: string;
  }> {
    const user = await this.getUserByUsername(username);

    if (!user) {
      return {
        valid: false,
        user: null,
        avatarUrl: null,
        error: "Roblox username not found",
      };
    }

    if (user.isBanned) {
      return {
        valid: false,
        user,
        avatarUrl: null,
        error: "This Roblox account is banned",
      };
    }

    const avatarUrl = await this.getUserAvatar(user.id);

    return {
      valid: true,
      user,
      avatarUrl,
    };
  }

  /**
   * Verify user owns the Roblox account by checking their profile description
   * for a verification code
   */
  async verifyOwnership(userId: number, verificationCode: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        return false;
      }

      // Check if the verification code is in the user's profile description
      return user.description.includes(verificationCode);
    } catch (error) {
      logger.error("Failed to verify Roblox ownership", { userId, error: String(error) });
      return false;
    }
  }
}

// Singleton instance
export const robloxService = new RobloxService();
