import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const getMyProfile = vi.fn().mockResolvedValue(undefined);

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, getMyProfile };
});

const { appRouter } = await import("./routers");

describe("profile.mine", () => {
  it("returns null rather than undefined when a signed-in account has not created a profile", async () => {
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "new-member",
        email: "member@example.com",
        name: "New member",
        loginMethod: "google",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.mine()).resolves.toBeNull();
  });
});
