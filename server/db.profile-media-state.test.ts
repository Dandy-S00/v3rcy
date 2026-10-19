import { beforeEach, describe, expect, it, vi } from "vitest";

type Media = {
  id: number;
  visibility: "public" | "hidden";
  isFeatured: boolean;
  url: string;
  mediaType: "image" | "video";
  mimeType: string;
  caption: null;
  sortOrder: number;
  createdAt: Date;
};
const state = vi.hoisted(() => ({ targetId: 0, media: [] as Media[] }));
vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: () => ({
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: vi.fn().mockImplementation(async () => {
          if (values.isFeatured === false)
            state.media.forEach(item => {
              item.isFeatured = false;
            });
          else {
            const target = state.media.find(item => item.id === state.targetId);
            if (target) Object.assign(target, values);
          }
        }),
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () =>
            Promise.resolve(state.media.map(item => ({ ...item }))),
        }),
      }),
    }),
  }),
}));

const seed = (): Media[] => [
  {
    id: 8,
    visibility: "public",
    isFeatured: true,
    url: "/one.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    caption: null,
    sortOrder: 0,
    createdAt: new Date(),
  },
  {
    id: 9,
    visibility: "public",
    isFeatured: false,
    url: "/two.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    caption: null,
    sortOrder: 1,
    createdAt: new Date(),
  },
];

describe("updateProfileMedia database state transitions", () => {
  beforeEach(() => {
    state.media = seed();
    state.targetId = 0;
    process.env.DATABASE_URL = "mysql://test";
    vi.resetModules();
  });
  it("returns a persisted hidden state and a restored public state for the selected media item", async () => {
    const db = await import("./db");
    state.targetId = 8;
    const hidden = await db.updateProfileMedia(4, 8, { visibility: "hidden" });
    expect(hidden.find(item => item.id === 8)?.visibility).toBe("hidden");
    const restored = await db.updateProfileMedia(4, 8, {
      visibility: "public",
    });
    expect(restored.find(item => item.id === 8)?.visibility).toBe("public");
  });
  it("returns exactly one featured item after replacing the prior featured media", async () => {
    const db = await import("./db");
    state.targetId = 9;
    const updated = await db.updateProfileMedia(4, 9, {
      featured: true,
      visibility: "public",
    });
    expect(
      updated.filter(item => item.isFeatured).map(item => item.id)
    ).toEqual([9]);
    expect(updated.find(item => item.id === 8)?.isFeatured).toBe(false);
  });
});
