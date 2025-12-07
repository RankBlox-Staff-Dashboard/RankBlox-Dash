import { Router } from "express";
import authRoutes from "./auth.routes.js";
import staffRoutes from "./staff.routes.js";
import verificationRoutes from "./verification.routes.js";

const router = Router();

// Health check
router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Staff Hub API is running",
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use("/auth", authRoutes);
router.use("/staff", staffRoutes);
router.use("/verification", verificationRoutes);

export default router;
