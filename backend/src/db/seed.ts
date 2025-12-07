import { initDatabase, closeDatabase } from "./database.js";
import { staffService } from "../services/staff.service.js";
import { logger } from "../utils/logger.js";

async function seed(): Promise<void> {
  try {
    logger.info("Seeding database...");
    initDatabase();

    // Create default admin user
    // Note: In production, you should use a real Roblox username
    try {
      const { staff, pin } = await staffService.createStaff({
        robloxUsername: "Roblox", // Default Roblox account for testing
        displayName: "Admin User",
        role: "admin",
        pin: "1234",
      });
      logger.info("Created admin user", { 
        id: staff.id, 
        robloxUsername: staff.robloxUsername,
        pin 
      });
    } catch (error) {
      // User might already exist
      logger.debug("Admin user may already exist", { error: String(error) });
    }

    // Create a test staff member
    try {
      const { staff, pin } = await staffService.createStaff({
        robloxUsername: "builderman", // Another well-known Roblox account
        displayName: "Staff Member",
        role: "staff",
        pin: "5678",
      });
      logger.info("Created staff user", { 
        id: staff.id, 
        robloxUsername: staff.robloxUsername,
        pin 
      });
    } catch (error) {
      logger.debug("Staff user may already exist", { error: String(error) });
    }

    logger.info("Database seeding completed");
  } catch (error) {
    logger.error("Seeding failed", { error: String(error) });
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

seed();
