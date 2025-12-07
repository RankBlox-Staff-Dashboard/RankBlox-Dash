import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { config } from "./config/index.js";
import { connectDatabase, closeDatabase } from "./db/database.js";
import { logger } from "./utils/logger.js";
import routes from "./routes/index.js";
import { verificationService } from "./services/verification.service.js";
import { authService } from "./services/auth.service.js";

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.allowedOrigins,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    success: false,
    error: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for accurate IP addresses
app.set("trust proxy", 1);

// API routes
app.use("/api", routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Not found",
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: config.isDev ? err.message : "Internal server error",
  });
});

// Cleanup job (runs every hour)
function startCleanupJob(): void {
  setInterval(() => {
    verificationService.cleanupExpiredSessions();
    authService.cleanupOldAttempts();
  }, 60 * 60 * 1000);
}

// Graceful shutdown
async function gracefulShutdown(): Promise<void> {
  logger.info("Shutting down gracefully...");
  await closeDatabase();
  process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Start server
async function start(): Promise<void> {
  try {
    // Initialize database
    await connectDatabase();

    // Start cleanup job
    startCleanupJob();

    // Start server
    app.listen(config.port, () => {
      logger.info(`Staff Hub API running on port ${config.port}`, {
        env: config.nodeEnv,
        allowedOrigins: config.allowedOrigins,
      });
    });
  } catch (error) {
    logger.error("Failed to start server", { error: String(error) });
    process.exit(1);
  }
}

start();

export { app };
