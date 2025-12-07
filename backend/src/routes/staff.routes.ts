import { Router, Request, Response } from "express";
import { staffService } from "../services/staff.service.js";
import { validate, schemas } from "../middleware/validation.js";
import type { ApiResponse, StaffMember } from "../types/index.js";

const router = Router();

// Helper to remove sensitive data
function sanitizeStaff(staff: StaffMember): Omit<StaffMember, "pinHash"> {
  const { pinHash, ...safe } = staff;
  return safe;
}

/**
 * GET /api/staff
 * Get all staff members
 */
router.get("/", (req: Request, res: Response): void => {
  const includeInactive = req.query.includeInactive === "true";
  const staff = staffService.getAll(includeInactive);

  const response: ApiResponse<Omit<StaffMember, "pinHash">[]> = {
    success: true,
    data: staff.map(sanitizeStaff),
  };

  res.json(response);
});

/**
 * GET /api/staff/:id
 * Get a staff member by ID
 */
router.get(
  "/:id",
  validate(schemas.idParam, "params"),
  (req: Request, res: Response): void => {
    const { id } = (req as any).validated;
    const staff = staffService.getById(id);

    if (!staff) {
      const response: ApiResponse = {
        success: false,
        error: "Staff member not found",
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Omit<StaffMember, "pinHash">> = {
      success: true,
      data: sanitizeStaff(staff),
    };

    res.json(response);
  }
);

/**
 * POST /api/staff
 * Create a new staff member
 */
router.post(
  "/",
  validate(schemas.createStaff),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const input = (req as any).validated;
      const { staff, pin } = await staffService.createStaff(input);

      const response: ApiResponse<{
        staff: Omit<StaffMember, "pinHash">;
        pin: string;
      }> = {
        success: true,
        data: {
          staff: sanitizeStaff(staff),
          pin,
        },
        message: `Staff member created. Their PIN is: ${pin}`,
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create staff member",
      };
      res.status(400).json(response);
    }
  }
);

/**
 * PATCH /api/staff/:id
 * Update a staff member
 */
router.patch(
  "/:id",
  validate(schemas.idParam, "params"),
  validate(schemas.updateStaff),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const input = (req as any).validated;
      const staff = await staffService.updateStaff(id, input);

      const response: ApiResponse<Omit<StaffMember, "pinHash">> = {
        success: true,
        data: sanitizeStaff(staff),
        message: "Staff member updated",
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update staff member",
      };
      res.status(400).json(response);
    }
  }
);

/**
 * POST /api/staff/:id/reset-pin
 * Reset a staff member's PIN
 */
router.post(
  "/:id/reset-pin",
  validate(schemas.idParam, "params"),
  validate(schemas.resetPin),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { newPin } = (req as any).validated || {};
      const pin = await staffService.resetPin(id, newPin);

      const response: ApiResponse<{ pin: string }> = {
        success: true,
        data: { pin },
        message: `PIN has been reset. New PIN: ${pin}`,
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : "Failed to reset PIN",
      };
      res.status(400).json(response);
    }
  }
);

/**
 * DELETE /api/staff/:id
 * Delete a staff member
 */
router.delete(
  "/:id",
  validate(schemas.idParam, "params"),
  (req: Request, res: Response): void => {
    const { id } = req.params;
    const deleted = staffService.deleteStaff(id);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: "Staff member not found",
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: "Staff member deleted",
    };

    res.json(response);
  }
);

/**
 * GET /api/staff/lookup/:username
 * Look up a staff member by Roblox username
 */
router.get("/lookup/:username", (req: Request, res: Response): void => {
  const { username } = req.params;
  const staff = staffService.getByRobloxUsername(username);

  if (!staff) {
    const response: ApiResponse = {
      success: false,
      error: "Staff member not found",
    };
    res.status(404).json(response);
    return;
  }

  const response: ApiResponse<Omit<StaffMember, "pinHash">> = {
    success: true,
    data: sanitizeStaff(staff),
  };

  res.json(response);
});

export default router;
