import type { ListLayoutMetadata } from "@/modules/dashboard/document/model/list.types";

import type {
  ListMeasurementProfile,
  MeasuredListItem,
} from "./measurement.types";

function isValidRange(from: number, to: number) {
  return (
    Number.isInteger(from) &&
    Number.isInteger(to) &&
    from >= 0 &&
    to > from
  );
}

export function createListMeasurementProfile({
  unitId,
  parentBlockId,
  metadata,
  fullHeight,
  items,
}: {
  unitId: string;
  parentBlockId: string;
  metadata: ListLayoutMetadata;
  fullHeight: number;
  items: MeasuredListItem[];
}): ListMeasurementProfile | null {
  if (
    !Number.isFinite(fullHeight) ||
    fullHeight < 0 ||
    items.length !== metadata.items.length ||
    items.some(
      (item, index) =>
        item.index !== index ||
        !isValidRange(item.sourceRange.from, item.sourceRange.to) ||
        item.sourceRange.from !== metadata.items[index]?.from ||
        item.sourceRange.to !== metadata.items[index]?.to ||
        !Number.isFinite(item.height) ||
        item.height < 0 ||
        !Number.isFinite(item.gapAfter) ||
        item.gapAfter < 0,
    )
  ) {
    return null;
  }

  const contentHeight = items.reduce(
    (total, item, index) =>
      total + item.height + (index < items.length - 1 ? item.gapAfter : 0),
    0,
  );
  const overhead = fullHeight - contentHeight;

  if (!Number.isFinite(overhead) || overhead < 0) {
    return null;
  }

  return {
    unitId,
    parentBlockId,
    ordered: metadata.ordered,
    start: metadata.start,
    itemCount: items.length,
    fullHeight,
    overhead,
    items,
  };
}

export function getListFragmentHeight(
  profile: ListMeasurementProfile,
  fromItem: number,
  toItem: number,
) {
  if (
    fromItem < 0 ||
    toItem <= fromItem ||
    toItem > profile.itemCount ||
    !Number.isInteger(fromItem) ||
    !Number.isInteger(toItem)
  ) {
    return null;
  }

  return profile.overhead + profile.items.slice(fromItem, toItem).reduce(
    (total, item, index) => {
      const absoluteIndex = fromItem + index;

      return (
        total +
        item.height +
        (absoluteIndex < toItem - 1 ? item.gapAfter : 0)
      );
    },
    0,
  );
}

export function findLargestFittingListFragment(
  profile: ListMeasurementProfile,
  fromItem: number,
  availableHeight: number,
) {
  if (fromItem < 0 || fromItem >= profile.itemCount) {
    return null;
  }

  let candidateHeight = profile.overhead;
  let fittingToItem: number | undefined;
  let fittingHeight: number | undefined;

  for (let index = fromItem; index < profile.itemCount; index += 1) {
    if (index > fromItem) {
      candidateHeight += profile.items[index - 1].gapAfter;
    }

    candidateHeight += profile.items[index].height;

    if (candidateHeight > availableHeight) {
      break;
    }

    fittingToItem = index + 1;
    fittingHeight = candidateHeight;
  }

  const toItem = fittingToItem ?? fromItem + 1;
  const height = fittingHeight ?? getListFragmentHeight(profile, fromItem, toItem);

  if (height === null || height === undefined) {
    return null;
  }

  return {
    fromItem,
    toItem,
    height,
    isOversized: height > availableHeight,
  };
}
