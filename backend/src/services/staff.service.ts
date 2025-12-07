import { StaffMemberModel } from "../db/models/index.js";
import { hashPin, verifyPin, generatePin } from "../utils/crypto.js";
import { logger } from "../utils/logger.js";
import { robloxService } from "./roblox.service.js";
import type { StaffMember, StaffPermissions, UserRole } from "../types/index.js";

interface CreateStaffInput {
  robloxUsername: string;
  displayName?: string;
  role?: UserRole;
  permissions?: Partial<StaffPermissions>;
  pin?: string;
}

interface UpdateStaffInput {
  displayName?: string;
  role?: UserRole;
  permissions?: Partial<StaffPermissions>;
  isActive?: boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, StaffPermissions> = {
  staff: {
    viewRestrictedData: true,
    editContent: true,
    sendMessages: true,
    manageStaff: false,
  },
  management: {
    viewRestrictedData: true,
    editContent: true,
    sendMessages: true,
    manageStaff: true,
  },
  admin: {
    viewRestrictedData: true,
    editContent: true,
    sendMessages: true,
    manageStaff: true,
  },
};

function docToStaffMember(doc: any): StaffMember {
  return {
    id: doc._id.toString(),
    robloxUsername: doc.robloxUsername,
    robloxUserId: doc.robloxUserId,
    displayName: doc.displayName,
    role: doc.role,
    pinHash: doc.pinHash,
    permissions: doc.permissions,
    avatarUrl: doc.avatarUrl,
    isActive: doc.isActive,
    isVerified: doc.isVerified,
    lastActive: doc.lastActive?.toISOString() || "",
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/**
 * Staff Management Service
 */
export class StaffService {
  /**
   * Create a new staff member
   */
  async createStaff(input: CreateStaffInput): Promise<{ staff: StaffMember; pin: string }> {
    // Validate Roblox username
    const robloxValidation = await robloxService.validateUsername(input.robloxUsername);
    if (!robloxValidation.valid) {
      throw new Error(robloxValidation.error || "Invalid Roblox username");
    }

    // Check if username already exists
    const existing = await StaffMemberModel.findOne({
      robloxUsername: input.robloxUsername.toLowerCase(),
    });

    if (existing) {
      throw new Error("A staff member with this Roblox username already exists");
    }

    const pin = input.pin || generatePin(4);
    const pinHash = await hashPin(pin);
    const role = input.role || "staff";
    const permissions = {
      ...ROLE_PERMISSIONS[role],
      ...input.permissions,
    };

    const staffDoc = await StaffMemberModel.create({
      robloxUsername: input.robloxUsername.toLowerCase(),
      robloxUserId: robloxValidation.user?.id || null,
      displayName: input.displayName || robloxValidation.user?.displayName || input.robloxUsername,
      role,
      pinHash,
      permissions,
      avatarUrl: robloxValidation.avatarUrl,
      isActive: true,
      isVerified: false,
    });

    logger.info("Staff member created", { 
      id: staffDoc._id.toString(), 
      robloxUsername: input.robloxUsername, 
      role 
    });

    return { staff: docToStaffMember(staffDoc), pin };
  }

  /**
   * Get staff member by ID
   */
  async getById(id: string): Promise<StaffMember | null> {
    const doc = await StaffMemberModel.findById(id);
    return doc ? docToStaffMember(doc) : null;
  }

  /**
   * Get staff member by Roblox username
   */
  async getByRobloxUsername(username: string): Promise<StaffMember | null> {
    const doc = await StaffMemberModel.findOne({
      robloxUsername: username.toLowerCase(),
    });
    return doc ? docToStaffMember(doc) : null;
  }

  /**
   * Get staff member by Roblox user ID
   */
  async getByRobloxUserId(userId: number): Promise<StaffMember | null> {
    const doc = await StaffMemberModel.findOne({ robloxUserId: userId });
    return doc ? docToStaffMember(doc) : null;
  }

  /**
   * Get all staff members
   */
  async getAll(includeInactive: boolean = false): Promise<StaffMember[]> {
    const filter = includeInactive ? {} : { isActive: true };
    const docs = await StaffMemberModel.find(filter).sort({ createdAt: -1 });
    return docs.map(docToStaffMember);
  }

  /**
   * Update staff member
   */
  async updateStaff(id: string, input: UpdateStaffInput): Promise<StaffMember> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error("Staff member not found");
    }

    const updateData: any = {};

    if (input.displayName !== undefined) {
      updateData.displayName = input.displayName;
    }

    if (input.role !== undefined) {
      updateData.role = input.role;
    }

    if (input.permissions !== undefined) {
      updateData.permissions = { ...existing.permissions, ...input.permissions };
    }

    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return existing;
    }

    const doc = await StaffMemberModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!doc) {
      throw new Error("Failed to update staff member");
    }

    logger.info("Staff member updated", { id, updates: Object.keys(input) });

    return docToStaffMember(doc);
  }

  /**
   * Reset staff member's PIN
   */
  async resetPin(id: string, newPin?: string): Promise<string> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error("Staff member not found");
    }

    const pin = newPin || generatePin(4);
    const pinHash = await hashPin(pin);

    await StaffMemberModel.findByIdAndUpdate(id, { $set: { pinHash } });

    logger.info("Staff PIN reset", { id, robloxUsername: existing.robloxUsername });

    return pin;
  }

  /**
   * Verify staff member's PIN
   */
  async verifyCredentials(
    robloxUsername: string,
    pin: string
  ): Promise<{ success: boolean; staff?: StaffMember; error?: string }> {
    const staff = await this.getByRobloxUsername(robloxUsername);

    if (!staff) {
      return { success: false, error: "Staff member not found" };
    }

    if (!staff.isActive) {
      return { success: false, error: "Account is deactivated" };
    }

    const pinValid = await verifyPin(pin, staff.pinHash);

    if (!pinValid) {
      return { success: false, error: "Invalid PIN" };
    }

    // Update last active
    await StaffMemberModel.findByIdAndUpdate(staff.id, {
      $set: { lastActive: new Date() },
    });

    return { success: true, staff };
  }

  /**
   * Delete staff member
   */
  async deleteStaff(id: string): Promise<boolean> {
    const result = await StaffMemberModel.findByIdAndDelete(id);
    
    if (result) {
      logger.info("Staff member deleted", { id });
      return true;
    }
    
    return false;
  }

  /**
   * Mark staff as verified (Roblox account ownership confirmed)
   */
  async markAsVerified(id: string): Promise<void> {
    await StaffMemberModel.findByIdAndUpdate(id, { $set: { isVerified: true } });
    logger.info("Staff member verified", { id });
  }
}

// Singleton instance
export const staffService = new StaffService();
