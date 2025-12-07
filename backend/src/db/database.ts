import mongoose from "mongoose";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

let isConnected = false;

/**
 * Initialize MongoDB connection
 */
export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    return;
  }

  try {
    mongoose.set("strictQuery", true);
    
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info("MongoDB connected successfully", { 
      uri: config.mongodbUri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@") // Hide credentials in logs
    });

    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error", { error: err.message });
    });

    mongoose.connection.on("disconnected", () => {
      isConnected = false;
      logger.warn("MongoDB disconnected");
    });

  } catch (error) {
    logger.error("Failed to connect to MongoDB", { error: String(error) });
    throw error;
  }
}

/**
 * Check if database is connected
 */
export function isDatabaseConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (isConnected) {
    await mongoose.connection.close();
    isConnected = false;
    logger.info("MongoDB connection closed");
  }
}

/**
 * Get the mongoose connection
 */
export function getConnection(): mongoose.Connection {
  return mongoose.connection;
}
