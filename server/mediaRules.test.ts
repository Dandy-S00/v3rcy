import { describe, expect, it } from "vitest";
import {
  getProfileMediaKind,
  hasProfileMediaAttestation,
  hasValidProfileMediaSignature,
  MAX_PROFILE_MEDIA_BYTES,
} from "./mediaRules";

describe("profile media upload rules", () => {
  it("accepts supported photos and videos while rejecting unsupported file types", () => {
    expect(getProfileMediaKind("image/webp")).toEqual({
      extension: "webp",
      mediaType: "image",
    });
    expect(getProfileMediaKind("video/mp4")).toEqual({
      extension: "mp4",
      mediaType: "video",
    });
    expect(getProfileMediaKind("application/pdf")).toBeNull();
  });
  it("keeps the profile media size limit at 25 MB", () =>
    expect(MAX_PROFILE_MEDIA_BYTES).toBe(25 * 1024 * 1024));
  it("requires the uploaded bytes to match the declared supported media type", () => {
    expect(
      hasValidProfileMediaSignature(
        "image/png",
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      )
    ).toBe(true);
    expect(
      hasValidProfileMediaSignature(
        "image/webp",
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ])
      )
    ).toBe(true);
    expect(
      hasValidProfileMediaSignature(
        "video/mp4",
        new Uint8Array([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70])
      )
    ).toBe(true);
    expect(
      hasValidProfileMediaSignature(
        "image/png",
        new Uint8Array([0xff, 0xd8, 0xff])
      )
    ).toBe(false);
    expect(
      hasValidProfileMediaSignature(
        "application/pdf",
        new Uint8Array([0x25, 0x50, 0x44, 0x46])
      )
    ).toBe(false);
  });
  it("requires an explicit affirmative ownership attestation", () => {
    expect(hasProfileMediaAttestation("true")).toBe(true);
    expect(hasProfileMediaAttestation(undefined)).toBe(false);
    expect(hasProfileMediaAttestation("yes")).toBe(false);
    expect(hasProfileMediaAttestation(["true"])).toBe(false);
  });
});
