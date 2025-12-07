import mongoose, { Schema, Document } from "mongoose";
import type { StaffPermissions, UserRole } from "../../types/index.js";

export interface IStaffMember extends Document {
  robloxUsername: string;
  robloxUserId: number | null;
  displayName: string;
  role: UserRole;
  pinHash: string;
  permissions: StaffPermissions;
  avatarUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  lastActive: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const StaffMemberSchema = new Schema<IStaffMember>(
  {
    robloxUsername: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    robloxUserId: {
      type: Number,
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["staff", "management", "admin"],
      default: "staff",
    },
    pinHash: {
      type: String,
      required: true,
    },
    permissions: {
      viewRestrictedData: { type: Boolean, default: false },
      editContent: { type: Boolean, default: false },
      sendMessages: { type: Boolean, default: true },
      manageStaff: { type: Boolean, default: false },
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastActive: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "staff_members",
  }
);

// Additional indexes (unique indexes are already created by schema)
StaffMemberSchema.index({ isActive: 1 });
StaffMemberSchema.index({ role: 1 });

export const StaffMemberModel = mongoose.model<IStaffMember>("StaffMember", StaffMemberSchema);
