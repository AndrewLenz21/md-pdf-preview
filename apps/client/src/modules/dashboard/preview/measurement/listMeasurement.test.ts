import { describe, expect, it } from "vitest";

import type { ListLayoutMetadata } from "@/modules/dashboard/document/model/list.types";

import {
  createListMeasurementProfile,
  findLargestFittingListFragment,
  getListFragmentHeight,
} from "./listMeasurement";

const metadata: ListLayoutMetadata = {
  ordered: true,
  start: 5,
  spread: false,
  items: [
    { index: 0, from: 0, to: 8 },
    { index: 1, from: 9, to: 17 },
    { index: 2, from: 18, to: 26 },
    { index: 3, from: 27, to: 35 },
  ],
};

function createProfile() {
  return createListMeasurementProfile({
    unitId: "list-1",
    parentBlockId: "block-1",
    metadata,
    fullHeight: 281,
    items: [
      { index: 0, sourceRange: metadata.items[0], height: 68, gapAfter: 5 },
      { index: 1, sourceRange: metadata.items[1], height: 64, gapAfter: 5 },
      { index: 2, sourceRange: metadata.items[2], height: 71, gapAfter: 5 },
      { index: 3, sourceRange: metadata.items[3], height: 58, gapAfter: 0 },
    ],
  });
}

describe("list measurement profiles", () => {
  it("fits the largest contiguous prefix using grouped-list geometry", () => {
    const profile = createProfile();

    expect(profile).not.toBeNull();

    if (!profile) {
      return;
    }

    expect(getListFragmentHeight(profile, 0, 3)).toBe(218);
    expect(findLargestFittingListFragment(profile, 0, 218)).toMatchObject({
      fromItem: 0,
      toItem: 3,
      height: 218,
      isOversized: false,
    });
    expect(findLargestFittingListFragment(profile, 0, 217)).toMatchObject({
      fromItem: 0,
      toItem: 2,
      height: 142,
      isOversized: false,
    });
  });

  it("removes the preceding-item gap for a continuation range", () => {
    const profile = createProfile();

    expect(profile).not.toBeNull();

    if (!profile) {
      return;
    }

    expect(getListFragmentHeight(profile, 2, 4)).toBe(139);
    expect(findLargestFittingListFragment(profile, 2, 139)).toMatchObject({
      fromItem: 2,
      toItem: 4,
    });
  });

  it("marks a single item oversized when it cannot fit a fresh page", () => {
    const profile = createProfile();

    expect(profile).not.toBeNull();

    if (!profile) {
      return;
    }

    expect(findLargestFittingListFragment(profile, 0, 10)).toMatchObject({
      fromItem: 0,
      toItem: 1,
      isOversized: true,
    });
  });

  it("rejects item geometry that does not own the metadata ranges", () => {
    expect(
      createListMeasurementProfile({
        unitId: "list-1",
        parentBlockId: "block-1",
        metadata,
        fullHeight: 100,
        items: [
          {
            index: 0,
            sourceRange: { from: 1, to: 8 },
            height: 100,
            gapAfter: 0,
          },
          ...metadata.items.slice(1).map((sourceRange, index) => ({
            index: index + 1,
            sourceRange,
            height: 0,
            gapAfter: 0,
          })),
        ],
      }),
    ).toBeNull();
  });
});
