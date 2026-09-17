import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("listings.browse city validation", () => {
  const caller = appRouter.createCaller({
    user: null,
    req: {} as any,
    res: {} as any,
  });

  it("accepts valid city input", async () => {
    const result = await caller.listings.browse({ city: "Los Angeles" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects address/coordinates input in city parameter", async () => {
    await expect(
      caller.listings.browse({ city: "123 Main St, New York" })
    ).rejects.toThrow();

    await expect(
      caller.listings.browse({ city: "34.0522, -118.2437" })
    ).rejects.toThrow();
  });
});
