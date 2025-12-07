import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV !== "production",

  // MongoDB Database
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/staffhub",

  // Security
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),

  // Roblox API
  robloxApiKey: process.env.ROBLOX_API_KEY || "",
  robloxOpenCloudApiKey: process.env.ROBLOX_OPEN_CLOUD_API_KEY || "",

  // CORS
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:8081,http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim()),

  // Verification
  verificationCodeLength: 6,
  verificationExpiryMinutes: 10,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
} as const;

export type Config = typeof config;
