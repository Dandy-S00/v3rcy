import { beforeEach, describe, expect, it, vi } from "vitest";

type Media = {
  id: number;
  userId: number;
  storageKey: string;
  url: string;
  mediaType: "image" | "video";
  mimeType: string;
  caption: null;
  visibility: "public" | "hidden";
  isFeatured: boolean;
  sortOrder: number;
  createdAt: Date;
};
const state = vi.hoisted(() => ({
  media: [] as Media[],
  nextId: 20,
  deletedId: 0,
  updateTargets: [] as number[],
}));
const sorted = () =>
  [...state.media]
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        right.createdAt.getTime() - left.createdAt.getTime()
    )
    .map(item => ({ ...item }));
const selection = () => ({
  orderBy: () => Promise.resolve(sorted()),
  then: <T>(resolve: (value: Media[]) => T, reject?: (reason: unknown) => T) =>
    Promise.resolve(sorted()).then(resolve, reject),
});

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: () => ({
    select: () => ({ from: () => ({ where: () => selection() }) }),
    update: () => ({
      set: (values: Partial<Media>) => ({
        where: vi.fn().mockImplementation(async () => {
          if (values.isFeatured === false)
            state.media.forEach(item => {
              item.isFeatured = false;
            });
          else {
            const targetId = state.updateTargets.shift();
            const target = state.media.find(item => item.id === targetId);
            if (target) Object.assign(target, values);
          }
        }),
      }),
    }),
    delete: () => ({
      where: vi.fn().mockImplementation(async () => {
        state.media = state.media.filter(item => item.id !== state.deletedId);
      }),
    }),
    insert: () => ({
      values: vi
        .fn()
        .mockImplementation(async (values: Omit<Media, "id" | "createdAt">) => {
          state.media.push({
            ...values,
            id: state.nextId,
            createdAt: new Date("2026-08-20T00:04:00Z"),
          });
        }),
    }),
  }),
}));

const seed = (): Media[] => [
  {
    id: 2,
    userId: 4,
    storageKey: "two",
    url: "/two.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    caption: null,
    visibility: "public",
    isFeatured: false,
    sortOrder: 0,
    createdAt: new Date("2026-08-20T00:01:00Z"),
  },
  {
    id: 5,
    userId: 4,
    storageKey: "five",
    url: "/five.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    caption: null,
    visibility: "public",
    isFeatured: false,
    sortOrder: 1,
    createdAt: new Date("2026-08-20T00:02:00Z"),
  },
  {
    id: 9,
    userId: 4,
    storageKey: "nine",
    url: "/nine.jpg",
    mediaType: "image",
    mimeType: "image/jpeg",
    caption: null,
    visibility: "public",
    isFeatured: true,
    sortOrder: 2,
    createdAt: new Date("2026-08-20T00:03:00Z"),
  },
];

describe("profile-media persisted ordering flow", () => {
  beforeEach(() => {
    state.media = seed();
    state.nextId = 20;
    state.deletedId = 0;
    state.updateTargets = [];
    process.env.DATABASE_URL = "mysql://test";
    vi.resetModules();
  });

  it("preserves the real owner and public gallery sequence after reorder, deletion, and a new upload", async () => {
    const db = await import("./db");
    state.updateTargets = [9, 2, 5, 9];
    await db.reorderProfileMedia(4, [9, 2, 5]);

    state.deletedId = 2;
    state.updateTargets = [5];
    await db.deleteProfileMedia(4, 2);
    await db.createProfileMedia({
      userId: 4,
      storageKey: "twenty",
      url: "/twenty.jpg",
      mediaType: "image",
      mimeType: "image/jpeg",
    });

    const ownerGallery = await db.getProfileMedia(4);
    const publicGallery = await db.getPublicProfileMedia(4);
    expect(ownerGallery.map(item => [item.id, item.sortOrder])).toEqual([
      [9, 0],
      [5, 1],
      [20, 2],
    ]);
    expect(publicGallery.map(item => [item.id, item.sortOrder])).toEqual([
      [9, 0],
      [5, 1],
      [20, 2],
    ]);
    expect(
      ownerGallery.filter(item => item.isFeatured).map(item => item.id)
    ).toEqual([9]);
  });
});
