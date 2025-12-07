import { describe, it, expect, vi, beforeEach } from "vitest";
import { RobloxService } from "../services/roblox.service.js";

describe("RobloxService", () => {
  let robloxService: RobloxService;

  beforeEach(() => {
    robloxService = new RobloxService();
    vi.clearAllMocks();
  });

  describe("getUserByUsername", () => {
    it("should return user info for valid username", async () => {
      // Mock fetch
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ requestedUsername: "Roblox", id: 1 }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 1,
            name: "Roblox",
            displayName: "Roblox",
            description: "Test description",
            created: "2006-02-27T21:06:40.3Z",
            isBanned: false,
            hasVerifiedBadge: true,
          }),
        });

      const user = await robloxService.getUserByUsername("Roblox");

      expect(user).not.toBeNull();
      expect(user?.id).toBe(1);
      expect(user?.name).toBe("Roblox");
    });

    it("should return null for non-existent username", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const user = await robloxService.getUserByUsername("nonexistentuser12345");

      expect(user).toBeNull();
    });

    it("should handle API errors gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const user = await robloxService.getUserByUsername("Roblox");

      expect(user).toBeNull();
    });
  });

  describe("getUserById", () => {
    it("should return user info for valid ID", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: "Roblox",
          displayName: "Roblox",
          description: "Test",
          created: "2006-02-27T21:06:40.3Z",
          isBanned: false,
          hasVerifiedBadge: true,
        }),
      });

      const user = await robloxService.getUserById(1);

      expect(user).not.toBeNull();
      expect(user?.id).toBe(1);
    });

    it("should return null for non-existent ID", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const user = await robloxService.getUserById(999999999);

      expect(user).toBeNull();
    });
  });

  describe("getUserAvatar", () => {
    it("should return avatar URL", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              targetId: 1,
              state: "Completed",
              imageUrl: "https://example.com/avatar.png",
            },
          ],
        }),
      });

      const avatarUrl = await robloxService.getUserAvatar(1);

      expect(avatarUrl).toBe("https://example.com/avatar.png");
    });

    it("should return null when no avatar found", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const avatarUrl = await robloxService.getUserAvatar(1);

      expect(avatarUrl).toBeNull();
    });
  });

  describe("validateUsername", () => {
    it("should return valid for existing non-banned user", async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ requestedUsername: "Roblox", id: 1 }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 1,
            name: "Roblox",
            displayName: "Roblox",
            description: "",
            created: "2006-02-27T21:06:40.3Z",
            isBanned: false,
            hasVerifiedBadge: true,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ targetId: 1, state: "Completed", imageUrl: "https://example.com/avatar.png" }],
          }),
        });

      const result = await robloxService.validateUsername("Roblox");

      expect(result.valid).toBe(true);
      expect(result.user).not.toBeNull();
      expect(result.avatarUrl).toBe("https://example.com/avatar.png");
    });

    it("should return invalid for banned user", async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ requestedUsername: "BannedUser", id: 123 }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 123,
            name: "BannedUser",
            displayName: "Banned",
            description: "",
            created: "2020-01-01T00:00:00Z",
            isBanned: true,
            hasVerifiedBadge: false,
          }),
        });

      const result = await robloxService.validateUsername("BannedUser");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("This Roblox account is banned");
    });
  });

  describe("verifyOwnership", () => {
    it("should return true when code is in profile", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: "Roblox",
          displayName: "Roblox",
          description: "My verification code is ABC123",
          created: "2006-02-27T21:06:40.3Z",
          isBanned: false,
          hasVerifiedBadge: true,
        }),
      });

      const verified = await robloxService.verifyOwnership(1, "ABC123");

      expect(verified).toBe(true);
    });

    it("should return false when code is not in profile", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: "Roblox",
          displayName: "Roblox",
          description: "No code here",
          created: "2006-02-27T21:06:40.3Z",
          isBanned: false,
          hasVerifiedBadge: true,
        }),
      });

      const verified = await robloxService.verifyOwnership(1, "ABC123");

      expect(verified).toBe(false);
    });
  });
});
