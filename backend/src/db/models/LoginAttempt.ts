import mongoose, { Schema, Document } from "mongoose";

export interface ILoginAttempt extends Document {
  robloxUsername: string;
  ipAddress: string;
  success: boolean;
  failureReason: string | null;
  createdAt: Date;
}

const LoginAttemptSchema = new Schema<ILoginAttempt>(
  {
    robloxUsername: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    success: {
      type: Boolean,
      default: false,
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "login_attempts",
  }
);

// Indexes
LoginAttemptSchema.index({ robloxUsername: 1 });
LoginAttemptSchema.index({ ipAddress: 1 });

// TTL index to auto-delete old attempts after 30 days
LoginAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const LoginAttemptModel = mongoose.model<ILoginAttempt>("LoginAttempt", LoginAttemptSchema);
