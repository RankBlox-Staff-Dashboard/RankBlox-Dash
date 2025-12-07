import { VerificationSessionModel } from "../db/models/index.js";
import { generateVerificationCode } from "../utils/crypto.js";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { robloxService } from "./roblox.service.js";
import { staffService } from "./staff.service.js";
import type { VerificationSession } from "../types/index.js";

function docToSession(doc: any): VerificationSession {
  return {
    id: doc._id.toString(),
    robloxUsername: doc.robloxUsername,
    robloxUserId: doc.robloxUserId,
    verificationCode: doc.verificationCode,
    expiresAt: doc.expiresAt.toISOString(),
    isCompleted: doc.isCompleted,
    createdAt: doc.createdAt.toISOString(),
  };
}

/**
 * Verification Service
 * Handles Roblox account ownership verification
 */
export class VerificationService {
  /**
   * Create a new verification session
   */
  async createSession(robloxUsername: string): Promise<{
    session: VerificationSession;
    instructions: string;
  }> {
    // Validate Roblox username first
    const validation = await robloxService.validateUsername(robloxUsername);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid Roblox username");
    }

    // Clean up any existing sessions for this user
    await VerificationSessionModel.deleteMany({
      robloxUsername: robloxUsername.toLowerCase(),
    });

    const verificationCode = generateVerificationCode(config.verificationCodeLength);
    const expiresAt = new Date(Date.now() + config.verificationExpiryMinutes * 60 * 1000);

    const sessionDoc = await VerificationSessionModel.create({
      robloxUsername: robloxUsername.toLowerCase(),
      robloxUserId: validation.user?.id || null,
      verificationCode,
      expiresAt,
      isCompleted: false,
    });

    logger.info("Verification session created", { 
      id: sessionDoc._id.toString(), 
      robloxUsername 
    });

    return {
      session: docToSession(sessionDoc),
      instructions: `To verify your Roblox account, add this code to your Roblox profile description: ${verificationCode}\n\nThis code expires in ${config.verificationExpiryMinutes} minutes.`,
    };
  }

  /**
   * Get session by ID
   */
  async getSessionById(id: string): Promise<VerificationSession | null> {
    const doc = await VerificationSessionModel.findById(id);
    return doc ? docToSession(doc) : null;
  }

  /**
   * Get active session for a username
   */
  async getActiveSession(robloxUsername: string): Promise<VerificationSession | null> {
    const doc = await VerificationSessionModel.findOne({
      robloxUsername: robloxUsername.toLowerCase(),
      isCompleted: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    return doc ? docToSession(doc) : null;
  }

  /**
   * Verify a session by checking the Roblox profile
   */
  async verifySession(sessionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const session = await this.getSessionById(sessionId);

    if (!session) {
      return { success: false, error: "Verification session not found" };
    }

    if (session.isCompleted) {
      return { success: false, error: "Verification already completed" };
    }

    if (new Date(session.expiresAt) < new Date()) {
      return { success: false, error: "Verification session expired" };
    }

    if (!session.robloxUserId) {
      return { success: false, error: "Roblox user ID not found" };
    }

    // Check if the verification code is in the user's profile
    const isVerified = await robloxService.verifyOwnership(
      session.robloxUserId,
      session.verificationCode
    );

    if (!isVerified) {
      return {
        success: false,
        error: `Verification code not found in profile. Please add "${session.verificationCode}" to your Roblox profile description.`,
      };
    }

    // Mark session as completed
    await VerificationSessionModel.findByIdAndUpdate(sessionId, {
      $set: { isCompleted: true },
    });

    // Mark staff member as verified if they exist
    const staff = await staffService.getByRobloxUsername(session.robloxUsername);
    if (staff) {
      await staffService.markAsVerified(staff.id);
    }

    logger.info("Verification completed", { sessionId, robloxUsername: session.robloxUsername });

    return { success: true };
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await VerificationSessionModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    
    if (result.deletedCount > 0) {
      logger.debug("Cleaned up expired verification sessions", { count: result.deletedCount });
    }
    
    return result.deletedCount;
  }
}

// Singleton instance
export const verificationService = new VerificationService();
