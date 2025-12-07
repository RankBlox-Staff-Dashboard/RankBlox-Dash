import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";
import type { ApiResponse } from "../types/index.js";

/**
 * Validation middleware factory
 */
export function validate<T>(schema: ZodSchema<T>, source: "body" | "query" | "params" = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source];
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      const response: ApiResponse = {
        success: false,
        error: "Validation failed",
        message: errors.map((e) => `${e.field}: ${e.message}`).join(", "),
      };

      res.status(400).json(response);
      return;
    }

    // Attach validated data to request
    (req as any).validated = result.data;
    next();
  };
}

// Common validation schemas
export const schemas = {
  // Staff registration
  createStaff: z.object({
    robloxUsername: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be at most 20 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    displayName: z.string().min(1).max(50).optional(),
    role: z.enum(["staff", "management", "admin"]).optional(),
    pin: z
      .string()
      .regex(/^\d{4,6}$/, "PIN must be 4-6 digits")
      .optional(),
    permissions: z
      .object({
        viewRestrictedData: z.boolean().optional(),
        editContent: z.boolean().optional(),
        sendMessages: z.boolean().optional(),
        manageStaff: z.boolean().optional(),
      })
      .optional(),
  }),

  // Staff update
  updateStaff: z.object({
    displayName: z.string().min(1).max(50).optional(),
    role: z.enum(["staff", "management", "admin"]).optional(),
    isActive: z.boolean().optional(),
    permissions: z
      .object({
        viewRestrictedData: z.boolean().optional(),
        editContent: z.boolean().optional(),
        sendMessages: z.boolean().optional(),
        manageStaff: z.boolean().optional(),
      })
      .optional(),
  }),

  // Login
  login: z.object({
    robloxUsername: z.string().min(1, "Username is required"),
    pin: z.string().min(4, "PIN is required").max(6),
  }),

  // Verification
  startVerification: z.object({
    robloxUsername: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be at most 20 characters"),
  }),

  // Reset PIN
  resetPin: z.object({
    newPin: z
      .string()
      .regex(/^\d{4,6}$/, "PIN must be 4-6 digits")
      .optional(),
  }),

  // ID parameter
  idParam: z.object({
    id: z.string().uuid("Invalid ID format"),
  }),
};
