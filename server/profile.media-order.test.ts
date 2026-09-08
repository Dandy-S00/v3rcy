import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ reorderProfileMedia: vi.fn() }));
vi.mock("./db", () => ({ reorderProfileMedia: mocks.reorderProfileMedia }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const user = { id: 7, openId: "owner", name: "Owner", email: "owner@example.com", loginMethod: "oauth", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const context = { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;

describe("profile.reorderMedia owner controls", () => {
  beforeEach(() => mocks.reorderProfileMedia.mockReset().mockResolvedValue([]));
  it("routes the submitted gallery sequence only to the authenticated owner", async () => {
    await appRouter.createCaller(context).profile.reorderMedia({ mediaIds: [14, 10, 12] });
    expect(mocks.reorderProfileMedia).toHaveBeenCalledWith(7, [14, 10, 12]);
  });
  it("rejects duplicate media ids before the database layer is called", async () => {
    await expect(appRouter.createCaller(context).profile.reorderMedia({ mediaIds: [14, 14] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.reorderProfileMedia).not.toHaveBeenCalled();
  });
});
