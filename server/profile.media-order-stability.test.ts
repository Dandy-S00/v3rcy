import { describe, expect, it } from "vitest";
import { getNextMediaSortOrder, getNormalizedMediaSortOrders } from "./db";

const orderedAfterDrag = [
  {
    id: 9,
    sortOrder: 0,
    createdAt: new Date("2026-08-20T00:03:00Z"),
    visibility: "public",
  },
  {
    id: 2,
    sortOrder: 1,
    createdAt: new Date("2026-08-20T00:02:00Z"),
    visibility: "hidden",
  },
  {
    id: 5,
    sortOrder: 2,
    createdAt: new Date("2026-08-20T00:01:00Z"),
    visibility: "public",
  },
];

describe("profile media gallery order stability", () => {
  it("removes sort-order gaps after deletion and allocates a new upload after the gallery", () => {
    const afterDelete = getNormalizedMediaSortOrders(
      orderedAfterDrag.filter(item => item.id !== 2)
    );
    expect(afterDelete).toEqual([
      { id: 9, sortOrder: 0 },
      { id: 5, sortOrder: 1 },
    ]);
    expect(getNextMediaSortOrder(afterDelete)).toBe(2);
  });

  it("keeps the resulting relative sequence stable for the owner and public gallery", () => {
    const ownerAfterUpload = [
      ...getNormalizedMediaSortOrders(
        orderedAfterDrag.filter(item => item.id !== 2)
      ),
      {
        id: 14,
        sortOrder: 2,
        createdAt: new Date("2026-08-20T00:04:00Z"),
        visibility: "public",
      },
    ];
    const ownerIds = [...ownerAfterUpload]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(item => item.id);
    const publicIds = [...ownerAfterUpload]
      .filter(item => !("visibility" in item) || item.visibility === "public")
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(item => item.id);
    expect(ownerIds).toEqual([9, 5, 14]);
    expect(publicIds).toEqual([9, 5, 14]);
  });
});
