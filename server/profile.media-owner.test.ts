import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ updateProfileMedia: vi.fn() }));
vi.mock("./db", () => ({ updateProfileMedia: mocks.updateProfileMedia }));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const user = { id: 7, openId: "owner", name: "Owner", email: "owner@example.com", loginMethod: "oauth", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const context = { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;

describe("profile.updateMedia owner controls", () => {
  beforeEach(() => mocks.updateProfileMedia.mockReset().mockResolvedValue([]));
  it("routes a hidden visibility change to the authenticated media owner only", async () => {
    await appRouter.createCaller(context).profile.updateMedia({ mediaId: 12, visibility: "hidden" });
    expect(mocks.updateProfileMedia).toHaveBeenCalledWith(7, 12, { visibility: "hidden", featured: undefined });
  });
  it("routes featured selection to the authenticated media owner, allowing the database layer to clear the previous feature", async () => {
    await appRouter.createCaller(context).profile.updateMedia({ mediaId: 19, featured: true, visibility: "public" });
    expect(mocks.updateProfileMedia).toHaveBeenCalledWith(7, 19, { visibility: "public", featured: true });
  });
});
