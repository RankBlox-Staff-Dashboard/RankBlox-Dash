/**
 * Core type definitions for Staff Hub Backend
 */

export type UserRole = "staff" | "management" | "admin";

export interface StaffMember {
  id: string;
  robloxUsername: string;
  robloxUserId: number | null;
  displayName: string;
  role: UserRole;
  pinHash: string;
  permissions: StaffPermissions;
  avatarUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffPermissions {
  viewRestrictedData: boolean;
  editContent: boolean;
  sendMessages: boolean;
  manageStaff: boolean;
}

export interface RobloxUserInfo {
  id: number;
  name: string;
  displayName: string;
  description: string;
  created: string;
  isBanned: boolean;
  hasVerifiedBadge: boolean;
}

export interface RobloxAvatarInfo {
  targetId: number;
  state: string;
  imageUrl: string;
}

export interface VerificationSession {
  id: string;
  robloxUsername: string;
  robloxUserId: number | null;
  verificationCode: string;
  expiresAt: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface LoginAttempt {
  id: string;
  robloxUsername: string;
  ipAddress: string;
  success: boolean;
  failureReason: string | null;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
