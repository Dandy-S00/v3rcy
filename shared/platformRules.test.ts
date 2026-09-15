import { describe, expect, it } from "vitest";
import { canPublishInCategory, isCityLevelLocation } from "./platformRules";

describe("category verification rules", () => {
  it("keeps companionship publishing behind ID verification", () => {
    expect(canPublishInCategory("companionship", "email")).toMatchObject({
      allowed: false,
      required: "id",
    });
    expect(canPublishInCategory("companionship", "id")).toMatchObject({
      allowed: true,
    });
  });

  it("allows non-restricted categories without an elevated verification state", () => {
    expect(canPublishInCategory("dating", "none")).toMatchObject({
      allowed: true,
    });
  });
});

describe("city-level location validation", () => {
  it("accepts a city and rejects apparent street addresses and coordinates", () => {
    expect(isCityLevelLocation("Austin, Texas")).toBe(true);
    expect(isCityLevelLocation("1201 Main Street")).toBe(false);
    expect(isCityLevelLocation("30.2672, -97.7431")).toBe(false);
  });
});
