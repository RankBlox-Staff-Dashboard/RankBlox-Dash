import { Router, Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import { validate, schemas } from "../middleware/validation.js";
import type { ApiResponse, StaffMember } from "../types/index.js";

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate with Roblox username and PIN
 */
router.post(
  "/login",
  validate(schemas.login),
  async (req: Request, res: Response): Promise<void> => {
    const { robloxUsername, pin } = (req as any).validated;
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

    const result = await authService.login(robloxUsername, pin, ipAddress);

    if (!result.success) {
      const response: ApiResponse = {
        success: false,
        error: result.error,
      };
      res.status(401).json(response);
      return;
    }

    // Don't send the PIN hash to the client
    const safeStaff = result.staff ? {
      ...result.staff,
      pinHash: undefined,
    } : undefined;

    const response: ApiResponse<Omit<StaffMember, "pinHash">> = {
      success: true,
      data: safeStaff as any,
      message: "Login successful",
    };

    res.json(response);
  }
);

/**
 * POST /api/auth/logout
 * Log out the current user (client-side session handling)
 */
router.post("/logout", (_req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: true,
    message: "Logged out successfully",
  };
  res.json(response);
});

/**
 * GET /api/auth/check-lockout
 * Check if a username/IP is locked out
 */
router.get("/check-lockout", (req: Request, res: Response): void => {
  const username = req.query.username as string;
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

  if (!username) {
    const response: ApiResponse = {
      success: false,
      error: "Username is required",
    };
    res.status(400).json(response);
    return;
  }

  const lockout = authService.isLockedOut(username, ipAddress);

  const response: ApiResponse<typeof lockout> = {
    success: true,
    data: lockout,
  };

  res.json(response);
});

export default router;
