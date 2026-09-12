import { describe, expect, it } from "vitest";
import { isSafeStorageKey } from "./_core/storageProxy";

describe("Storage proxy key validation", () => {
  it("accepts valid storage relative keys", () => {
    expect(isSafeStorageKey("profile-media/1/123456789.jpg")).toBe(true);
    expect(isSafeStorageKey("avatar.png")).toBe(true);
    expect(isSafeStorageKey("user_data/folder/item.webp")).toBe(true);
  });

  it("rejects path traversal attempts with double dots", () => {
    expect(isSafeStorageKey("../secret.txt")).toBe(false);
    expect(isSafeStorageKey("foo/../../secret.txt")).toBe(false);
    expect(isSafeStorageKey("profile-media/../etc/passwd")).toBe(false);
    expect(isSafeStorageKey("..")).toBe(false);
  });

  it("rejects URL-encoded path traversal sequences", () => {
    expect(isSafeStorageKey("%2e%2e%2fsecret.txt")).toBe(false);
    expect(isSafeStorageKey("foo%2f..%2fbar")).toBe(false);
    expect(isSafeStorageKey("%2e%2e/etc/passwd")).toBe(false);
  });

  it("rejects null byte injection", () => {
    expect(isSafeStorageKey("valid.jpg\0.exe")).toBe(false);
    expect(isSafeStorageKey("valid.jpg%00.exe")).toBe(false);
  });

  it("rejects empty or non-string inputs", () => {
    expect(isSafeStorageKey("")).toBe(false);
    expect(isSafeStorageKey(null as any)).toBe(false);
    expect(isSafeStorageKey(undefined as any)).toBe(false);
  });
});
