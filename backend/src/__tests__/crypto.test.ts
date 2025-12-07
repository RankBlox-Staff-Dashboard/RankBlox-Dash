import { describe, it, expect } from "vitest";
import {
  hashPin,
  verifyPin,
  generatePin,
  generateVerificationCode,
  generateId,
  secureCompare,
} from "../utils/crypto.js";

describe("Crypto Utils", () => {
  describe("hashPin", () => {
    it("should hash a PIN", async () => {
      const pin = "1234";
      const hash = await hashPin(pin);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(pin);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should produce different hashes for same PIN", async () => {
      const pin = "1234";
      const hash1 = await hashPin(pin);
      const hash2 = await hashPin(pin);
      
      // bcrypt produces different hashes due to salt
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPin", () => {
    it("should verify correct PIN", async () => {
      const pin = "1234";
      const hash = await hashPin(pin);
      
      const isValid = await verifyPin(pin, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect PIN", async () => {
      const pin = "1234";
      const hash = await hashPin(pin);
      
      const isValid = await verifyPin("5678", hash);
      expect(isValid).toBe(false);
    });
  });

  describe("generatePin", () => {
    it("should generate a 4-digit PIN by default", () => {
      const pin = generatePin();
      
      expect(pin).toMatch(/^\d{4}$/);
    });

    it("should generate a PIN of specified length", () => {
      const pin = generatePin(6);
      
      expect(pin).toMatch(/^\d{6}$/);
    });

    it("should generate different PINs", () => {
      const pins = new Set<string>();
      for (let i = 0; i < 100; i++) {
        pins.add(generatePin());
      }
      
      // Should have many unique PINs (statistically unlikely to have duplicates)
      expect(pins.size).toBeGreaterThan(90);
    });
  });

  describe("generateVerificationCode", () => {
    it("should generate a 6-character code by default", () => {
      const code = generateVerificationCode();
      
      expect(code.length).toBe(6);
    });

    it("should generate alphanumeric codes", () => {
      const code = generateVerificationCode();
      
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it("should not contain confusing characters", () => {
      // Generate many codes and check none contain I, O, 0, 1
      for (let i = 0; i < 100; i++) {
        const code = generateVerificationCode();
        expect(code).not.toMatch(/[IO01]/);
      }
    });
  });

  describe("generateId", () => {
    it("should generate a valid UUID", () => {
      const id = generateId();
      
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it("should generate unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      
      expect(ids.size).toBe(100);
    });
  });

  describe("secureCompare", () => {
    it("should return true for equal strings", () => {
      expect(secureCompare("abc123", "abc123")).toBe(true);
    });

    it("should return false for different strings", () => {
      expect(secureCompare("abc123", "abc124")).toBe(false);
    });

    it("should return false for different length strings", () => {
      expect(secureCompare("abc", "abcd")).toBe(false);
    });
  });
});
