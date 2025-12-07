import { Router, Request, Response } from "express";
import { verificationService } from "../services/verification.service.js";
import { robloxService } from "../services/roblox.service.js";
import { validate, schemas } from "../middleware/validation.js";
import type { ApiResponse, VerificationSession } from "../types/index.js";

const router = Router();

/**
 * POST /api/verification/start
 * Start a new verification session
 */
router.post(
  "/start",
  validate(schemas.startVerification),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { robloxUsername } = (req as any).validated;
      const result = await verificationService.createSession(robloxUsername);

      const response: ApiResponse<{
        session: VerificationSession;
        instructions: string;
      }> = {
        success: true,
        data: result,
        message: "Verification session created",
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : "Failed to start verification",
      };
      res.status(400).json(response);
    }
  }
);

/**
 * POST /api/verification/:sessionId/verify
 * Verify a session by checking the Roblox profile
 */
router.post(
  "/:sessionId/verify",
  async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    const result = await verificationService.verifySession(sessionId);

    if (!result.success) {
      const response: ApiResponse = {
        success: false,
        error: result.error,
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: "Verification successful! Your Roblox account has been verified.",
    };

    res.json(response);
  }
);

/**
 * GET /api/verification/:sessionId
 * Get verification session status
 */
router.get("/:sessionId", (req: Request, res: Response): void => {
  const { sessionId } = req.params;
  const session = verificationService.getSessionById(sessionId);

  if (!session) {
    const response: ApiResponse = {
      success: false,
      error: "Verification session not found",
    };
    res.status(404).json(response);
    return;
  }

  const response: ApiResponse<VerificationSession> = {
    success: true,
    data: session,
  };

  res.json(response);
});

/**
 * GET /api/verification/check/:username
 * Check if a username has an active verification session
 */
router.get("/check/:username", (req: Request, res: Response): void => {
  const { username } = req.params;
  const session = verificationService.getActiveSession(username);

  const response: ApiResponse<{ hasActiveSession: boolean; session?: VerificationSession }> = {
    success: true,
    data: {
      hasActiveSession: !!session,
      session: session || undefined,
    },
  };

  res.json(response);
});

/**
 * POST /api/verification/validate-username
 * Validate a Roblox username exists
 */
router.post(
  "/validate-username",
  validate(schemas.startVerification),
  async (req: Request, res: Response): Promise<void> => {
    const { robloxUsername } = (req as any).validated;
    const result = await robloxService.validateUsername(robloxUsername);

    const response: ApiResponse<typeof result> = {
      success: result.valid,
      data: result,
      error: result.error,
    };

    res.status(result.valid ? 200 : 400).json(response);
  }
);

export default router;
