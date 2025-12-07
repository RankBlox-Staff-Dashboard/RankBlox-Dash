import { LoginAttemptModel } from "../db/models/index.js";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { staffService } from "./staff.service.js";
import type { StaffMember, LoginAttempt } from "../types/index.js";

function docToLoginAttempt(doc: any): LoginAttempt {
  return {
    id: doc._id.toString(),
    robloxUsername: doc.robloxUsername,
    ipAddress: doc.ipAddress,
    success: doc.success,
    failureReason: doc.failureReason,
    createdAt: doc.createdAt.toISOString(),
  };
}

/**
 * Authentication Service
 * Handles login attempts, rate limiting, and session management
 */
export class AuthService {
  /**
   * Record a login attempt
   */
  async recordLoginAttempt(
    robloxUsername: string,
    ipAddress: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    await LoginAttemptModel.create({
      robloxUsername: robloxUsername.toLowerCase(),
      ipAddress,
      success,
      failureReason: failureReason || null,
    });

    logger.debug("Login attempt recorded", { robloxUsername, ipAddress, success });
  }

  /**
   * Get recent failed login attempts for a username
   */
  async getRecentFailedAttempts(robloxUsername: string, minutes: number = 15): Promise<LoginAttempt[]> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);

    const docs = await LoginAttemptModel.find({
      robloxUsername: robloxUsername.toLowerCase(),
      success: false,
      createdAt: { $gt: cutoff },
    }).sort({ createdAt: -1 });

    return docs.map(docToLoginAttempt);
  }

  /**
   * Get recent failed login attempts for an IP address
   */
  async getRecentFailedAttemptsByIp(ipAddress: string, minutes: number = 15): Promise<LoginAttempt[]> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);

    const docs = await LoginAttemptModel.find({
      ipAddress,
      success: false,
      createdAt: { $gt: cutoff },
    }).sort({ createdAt: -1 });

    return docs.map(docToLoginAttempt);
  }

  /**
   * Check if a username or IP is locked out due to too many failed attempts
   */
  async isLockedOut(robloxUsername: string, ipAddress: string): Promise<{
    locked: boolean;
    reason?: string;
    remainingMinutes?: number;
  }> {
    const userAttempts = await this.getRecentFailedAttempts(
      robloxUsername,
      config.lockoutDurationMinutes
    );
    const ipAttempts = await this.getRecentFailedAttemptsByIp(
      ipAddress,
      config.lockoutDurationMinutes
    );

    if (userAttempts.length >= config.maxLoginAttempts) {
      const oldestAttempt = userAttempts[userAttempts.length - 1];
      const unlockTime = new Date(oldestAttempt.createdAt).getTime() + 
        config.lockoutDurationMinutes * 60 * 1000;
      const remainingMinutes = Math.ceil((unlockTime - Date.now()) / 60000);

      return {
        locked: true,
        reason: "Too many failed login attempts for this account",
        remainingMinutes,
      };
    }

    if (ipAttempts.length >= config.maxLoginAttempts * 2) {
      const oldestAttempt = ipAttempts[ipAttempts.length - 1];
      const unlockTime = new Date(oldestAttempt.createdAt).getTime() + 
        config.lockoutDurationMinutes * 60 * 1000;
      const remainingMinutes = Math.ceil((unlockTime - Date.now()) / 60000);

      return {
        locked: true,
        reason: "Too many failed login attempts from this IP",
        remainingMinutes,
      };
    }

    return { locked: false };
  }

  /**
   * Authenticate a user with username and PIN
   */
  async login(
    robloxUsername: string,
    pin: string,
    ipAddress: string
  ): Promise<{
    success: boolean;
    staff?: StaffMember;
    error?: string;
  }> {
    // Check for lockout
    const lockout = await this.isLockedOut(robloxUsername, ipAddress);
    if (lockout.locked) {
      await this.recordLoginAttempt(robloxUsername, ipAddress, false, "Account locked");
      return {
        success: false,
        error: `${lockout.reason}. Try again in ${lockout.remainingMinutes} minutes.`,
      };
    }

    // Verify credentials
    const result = await staffService.verifyCredentials(robloxUsername, pin);

    // Record the attempt
    await this.recordLoginAttempt(
      robloxUsername,
      ipAddress,
      result.success,
      result.error
    );

    if (!result.success) {
      const attempts = await this.getRecentFailedAttempts(robloxUsername, config.lockoutDurationMinutes);
      const remaining = config.maxLoginAttempts - attempts.length;

      return {
        success: false,
        error: remaining > 0
          ? `${result.error}. ${remaining} attempts remaining.`
          : result.error,
      };
    }

    logger.info("User logged in", { 
      robloxUsername, 
      staffId: result.staff?.id,
      ipAddress 
    });

    return {
      success: true,
      staff: result.staff,
    };
  }

  /**
   * Clean up old login attempts
   */
  async cleanupOldAttempts(daysToKeep: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await LoginAttemptModel.deleteMany({
      createdAt: { $lt: cutoff },
    });

    if (result.deletedCount > 0) {
      logger.debug("Cleaned up old login attempts", { count: result.deletedCount });
    }

    return result.deletedCount;
  }
}

// Singleton instance
export const authService = new AuthService();
