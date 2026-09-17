import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  saveMyProfile: vi.fn(),
  deleteProfileMedia: vi.fn(),
  createSafetySignal: vi.fn(),
  consumeActionLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock("./db", () => ({
  getMyProfile: mocks.getMyProfile,
  saveMyProfile: mocks.saveMyProfile,
  deleteProfileMedia: mocks.deleteProfileMedia,
  createSafetySignal: mocks.createSafetySignal,
}));

vi.mock("./platformControls", () => ({
  consumeActionLimit: mocks.consumeActionLimit,
}));

import { appRouter } from "./routers";
import { isValidStorageKey } from "./_core/storageProxy";
import { getSessionCookieOptions, isSecureRequest } from "./_core/cookies";
import type { Request } from "express";
import type { TrpcContext } from "./_core/context";

const suspendedUser = { id: 99, openId: "suspended-user", name: "Suspended", role: "user" as const };
const activeUser = { id: 100, openId: "active-user", name: "Active", role: "user" as const };

function makeContext(user: any): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as Request,
    res: {} as any,
  };
}

describe("Security & Best Practices", () => {
  describe("Account Status Enforcement", () => {
    it("blocks suspended accounts from saving profile updates", async () => {
      mocks.getMyProfile.mockResolvedValueOnce({ userId: 99, accountStatus: "suspended" });

      const caller = appRouter.createCaller(makeContext(suspendedUser));

      await expect(
        caller.profile.save({
          displayName: "New Name",
          bio: "Hello",
          age: 25,
          city: "Chicago",
          preferences: ["dating"],
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Your account is currently unavailable.",
      });

      expect(mocks.saveMyProfile).not.toHaveBeenCalled();
    });

    it("blocks suspended accounts from deleting profile media", async () => {
      mocks.getMyProfile.mockResolvedValueOnce({ userId: 99, accountStatus: "suspended" });

      const caller = appRouter.createCaller(makeContext(suspendedUser));

      await expect(caller.profile.deleteMedia({ mediaId: 5 })).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Your account is currently unavailable.",
      });

      expect(mocks.deleteProfileMedia).not.toHaveBeenCalled();
    });

    it("allows active accounts to update profile", async () => {
      mocks.getMyProfile.mockResolvedValueOnce({ userId: 100, accountStatus: "active" });
      mocks.saveMyProfile.mockResolvedValueOnce({ userId: 100, displayName: "Active Name" });

      const caller = appRouter.createCaller(makeContext(activeUser));

      const result = await caller.profile.save({
        displayName: "Active Name",
        bio: "Bio",
        age: 30,
        city: "Seattle",
        preferences: ["social"],
      });

      expect(result).toEqual({ userId: 100, displayName: "Active Name" });
    });
  });

  describe("Storage Proxy Path Traversal Guard", () => {
    it("allows valid relative storage keys", () => {
      expect(isValidStorageKey("profile-media/123/image.png")).toBe(true);
      expect(isValidStorageKey("avatars/user_456.jpg")).toBe(true);
      expect(isValidStorageKey("file.txt")).toBe(true);
    });

    it("rejects path traversal attempts and malicious keys", () => {
      expect(isValidStorageKey("../secret.env")).toBe(false);
      expect(isValidStorageKey("profile-media/../../etc/passwd")).toBe(false);
      expect(isValidStorageKey("/absolute/path")).toBe(false);
      expect(isValidStorageKey("\\windows\\path")).toBe(false);
      expect(isValidStorageKey("file\0name.png")).toBe(false);
      expect(isValidStorageKey("file name.png")).toBe(false);
      expect(isValidStorageKey("")).toBe(false);
    });
  });

  describe("Cookie Security Configuration", () => {
    it("returns SameSite=Lax and HttpOnly for session cookies", () => {
      const mockReq = {
        protocol: "https",
        headers: {},
      } as unknown as Request;

      const options = getSessionCookieOptions(mockReq);
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe("lax");
      expect(options.path).toBe("/");
      expect(options.secure).toBe(true);
    });

    it("correctly identifies non-secure vs secure requests", () => {
      const httpReq = {
        protocol: "http",
        headers: {},
      } as unknown as Request;
      expect(isSecureRequest(httpReq)).toBe(false);

      const forwardedHttpsReq = {
        protocol: "http",
        headers: { "x-forwarded-proto": "https" },
      } as unknown as Request;
      expect(isSecureRequest(forwardedHttpsReq)).toBe(true);
    });
  });
});
