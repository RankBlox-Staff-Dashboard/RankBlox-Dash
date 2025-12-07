import mongoose, { Schema, Document } from "mongoose";

export interface IVerificationSession extends Document {
  robloxUsername: string;
  robloxUserId: number | null;
  verificationCode: string;
  expiresAt: Date;
  isCompleted: boolean;
  createdAt: Date;
}

const VerificationSessionSchema = new Schema<IVerificationSession>(
  {
    robloxUsername: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    robloxUserId: {
      type: Number,
      default: null,
    },
    verificationCode: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "verification_sessions",
  }
);

// Indexes
VerificationSessionSchema.index({ verificationCode: 1 });
VerificationSessionSchema.index({ robloxUsername: 1 });

// TTL index to auto-delete expired sessions after 24 hours
VerificationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

export const VerificationSessionModel = mongoose.model<IVerificationSession>(
  "VerificationSession",
  VerificationSessionSchema
);
