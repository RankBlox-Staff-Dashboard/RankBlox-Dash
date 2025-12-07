import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { app } from "../index.js";
import { initDatabase, closeDatabase, getDatabase } from "../db/database.js";
import { hashPin } from "../utils/crypto.js";

// Mock fetch for Roblox API calls
global.fetch = vi.fn();

function mockRobloxUser(username: string, userId: number) {
  (global.fetch as any)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ requestedUsername: username, id: userId }],
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: userId,
        name: username,
        displayName: username,
        description: "",
        created: "2020-01-01T00:00:00Z",
        isBanned: false,
        hasVerifiedBadge: false,
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ targetId: userId, state: "Completed", imageUrl: "https://example.com/avatar.png" }],
      }),
    });
}

describe("API Endpoints", () => {
  beforeAll(() => {
    // Use in-memory database for tests
    process.env.DATABASE_PATH = ":memory:";
    initDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear database tables
    const db = getDatabase();
    db.exec("DELETE FROM staff_members");
    db.exec("DELETE FROM verification_sessions");
    db.exec("DELETE FROM login_attempts");
  });

  describe("GET /api/health", () => {
    it("should return health status", async () => {
      const response = await fetch("http://localhost:3001/api/health");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Staff Hub API is running");
    });
  });

  describe("POST /api/staff", () => {
    it("should create a new staff member", async () => {
      mockRobloxUser("TestUser", 12345);

      const response = await fetch("http://localhost:3001/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          robloxUsername: "TestUser",
          displayName: "Test User",
          role: "staff",
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.staff.robloxUsername).toBe("TestUser");
      expect(data.data.pin).toMatch(/^\d{4}$/);
    });

    it("should reject invalid username format", async () => {
      const response = await fetch("http://localhost:3001/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          robloxUsername: "ab", // Too short
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should authenticate with valid credentials", async () => {
      // Create a staff member first
      const db = getDatabase();
      const pinHash = await hashPin("1234");
      db.prepare(`
        INSERT INTO staff_members (id, roblox_username, display_name, role, pin_hash, permissions, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run("test-id", "TestUser", "Test User", "staff", pinHash, "{}");

      const response = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          robloxUsername: "TestUser",
          pin: "1234",
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.robloxUsername).toBe("TestUser");
    });

    it("should reject invalid PIN", async () => {
      const db = getDatabase();
      const pinHash = await hashPin("1234");
      db.prepare(`
        INSERT INTO staff_members (id, roblox_username, display_name, role, pin_hash, permissions, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run("test-id", "TestUser", "Test User", "staff", pinHash, "{}");

      const response = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          robloxUsername: "TestUser",
          pin: "9999",
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe("POST /api/verification/start", () => {
    it("should create verification session", async () => {
      mockRobloxUser("TestUser", 12345);

      const response = await fetch("http://localhost:3001/api/verification/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          robloxUsername: "TestUser",
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.session.verificationCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(data.data.instructions).toContain("verification code");
    });
  });
});
