import { initDatabase, closeDatabase } from "./database.js";
import { logger } from "../utils/logger.js";

async function migrate(): Promise<void> {
  try {
    logger.info("Running database migrations...");
    initDatabase();
    logger.info("Database migrations completed successfully");
  } catch (error) {
    logger.error("Migration failed", { error: String(error) });
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

migrate();
