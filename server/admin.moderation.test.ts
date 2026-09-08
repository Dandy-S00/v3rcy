import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const moderateListing = vi.fn().mockResolvedValue(undefined);

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, moderateListing };
});

const { appRouter } = await import("./routers");

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 77,
      openId: "owner-77",
      email: "owner@nitevow.example",
      name: "Studio Owner",
      loginMethod: "oauth",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin.moderateListing", () => {
  it.each(["approve", "flag", "remove"] as const)("records the %s moderation transition", async (action) => {
    moderateListing.mockClear();
    const caller = appRouter.createCaller(createAdminContext());
    await caller.admin.moderateListing({ listingId: 41, action, note: "Moderation review" });
    expect(moderateListing).toHaveBeenCalledWith({ adminUserId: 77, listingId: 41, action, note: "Moderation review" });
  });
});
