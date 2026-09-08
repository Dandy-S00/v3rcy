import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicProfile: vi.fn(),
  getPublicProfileMedia: vi.fn(),
}));
vi.mock("./db", () => ({
  getPublicProfile: mocks.getPublicProfile,
  getPublicProfileMedia: mocks.getPublicProfileMedia,
}));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context = {
  user: null,
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} as TrpcContext;

describe("profile.get media visibility", () => {
  beforeEach(() =>
    mocks.getPublicProfile
      .mockReset()
      .mockResolvedValue({
        userId: 2,
        displayName: "Member",
        age: 29,
        city: "Austin",
        preferences: [],
        verificationStatus: "email",
        bio: null,
        createdAt: new Date(),
      })
  );
  it("returns only the server-provided public media collection for a member profile", async () => {
    mocks.getPublicProfileMedia.mockResolvedValue([
      {
        id: 1,
        mediaType: "image",
        url: "/storage/public.jpg",
        isFeatured: true,
      },
    ]);
    const result = await appRouter
      .createCaller(context)
      .profile.get({ userId: 2 });
    expect(mocks.getPublicProfileMedia).toHaveBeenCalledWith(2);
    expect(result?.media).toEqual([
      {
        id: 1,
        mediaType: "image",
        url: "/storage/public.jpg",
        isFeatured: true,
      },
    ]);
  });
});
