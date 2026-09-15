import { describe, expect, it } from "vitest";
import {
  canPublishInCategory,
  isCityLevelLocation,
} from "../shared/platformRules";

describe("NiteVow publication rules", () => {
  it("requires ID verification for companionship listings", () => {
    expect(canPublishInCategory("companionship", "email")).toMatchObject({
      allowed: false,
      required: "id",
    });
    expect(canPublishInCategory("companionship", "id")).toMatchObject({
      allowed: true,
    });
  });

  it("keeps city fields free of street addresses and coordinates", () => {
    expect(isCityLevelLocation("Austin, Texas")).toBe(true);
    expect(isCityLevelLocation("1201 Main Street")).toBe(false);
    expect(isCityLevelLocation("30.2672, -97.7431")).toBe(false);
  });
});
