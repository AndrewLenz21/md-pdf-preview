import type {
  BlankSpaceMeasurementProfile,
  CodeMeasurementProfile,
  ListMeasurementProfile,
  MeasuredLayoutUnit,
  ParagraphMeasurementProfile,
} from "@/modules/dashboard/preview/measurement/measurement.types";
import {
  findLargestFittingListFragment,
  getListFragmentHeight,
} from "@/modules/dashboard/preview/measurement/listMeasurement";
import {
  findLargestFittingBlankSpace,
  getBlankSpaceFragmentHeight,
} from "@/modules/dashboard/preview/measurement/blankSpaceMeasurement";
import {
  getLargestFittingParagraphPrefix,
  getParagraphSegmentHeight,
} from "@/modules/dashboard/preview/measurement/paragraphMeasurement";

import { createPageFragments } from "./pageFragments";
import { getListFragmentSource } from "./documentLayout";
import type { DocumentLayoutUnit, PageFragment } from "./pagination.types";
import { resolvePreviewStrategy } from "./strategies/resolvePreviewStrategy";
import type { PreviewStrategy } from "./strategies/previewStrategy.types";

export type DocumentPagePlan = {
  id: string;
  fragments: PageFragment[];
  contentHeight: number;
  isOversized: boolean;
};

type WorkingPagePlan = Omit<DocumentPagePlan, "fragments"> & {
  units: DocumentLayoutUnit[];
};

function createParagraphFragment(
  unit: DocumentLayoutUnit,
  from: number,
  to: number,
) {
  return {
    ...unit,
    id: `${unit.id}:paragraph:${from}-${to}`,
    kind: "paragraphFragment" as const,
    source: unit.source.slice(from, to),
    sourceRange: {
      from: unit.sourceRange.from + from,
      to: unit.sourceRange.from + to,
    },
    sourceRepresentation: "direct" as const,
    splittingStrategy: "atomic" as const,
    keepWithNext: false,
  };
}

function createListFragment(
  unit: DocumentLayoutUnit,
  fromItem: number,
  toItem: number,
) {
  const metadata = unit.listMetadata;
  const firstItem = metadata?.items[fromItem];
  const lastItem = metadata?.items[toItem - 1];

  if (!metadata || !firstItem || !lastItem) {
    return unit;
  }

  const sourceRange = {
    from: firstItem.from,
    to: lastItem.to,
  };
  const source = getListFragmentSource(unit, fromItem, toItem);

  return {
    ...unit,
    id: `${unit.id}:list:${fromItem}-${toItem}`,
    kind: "listFragment" as const,
    source,
    sourceRange,
    sourceRepresentation:
      unit.parentBlock.source.slice(sourceRange.from, sourceRange.to) === source
        ? ("direct" as const)
        : ("reconstructed" as const),
    splittingStrategy: "atomic" as const,
    keepWithNext: false,
  };
}

function createBlankSpaceFragment(
  unit: DocumentLayoutUnit,
  fromLine: number,
  toLine: number,
) {
  const metadata = unit.blankSpaceMetadata;
  const firstLine = metadata?.lineRanges[fromLine];
  const lastLine = metadata?.lineRanges[toLine - 1];

  if (!metadata || !firstLine || !lastLine) {
    return unit;
  }

  const source = unit.source.slice(firstLine.from, lastLine.to);
  const sourceRange = {
    from: metadata.sourceRange.from + firstLine.from,
    to: metadata.sourceRange.from + lastLine.to,
  };

  return {
    ...unit,
    id: `${unit.id}:blank:${fromLine}-${toLine}`,
    source,
    sourceRange: { from: 0, to: source.length },
    blankSpaceMetadata: {
      boundary: metadata.boundary,
      lineCount: toLine - fromLine,
      startLine: metadata.startLine + fromLine,
      totalLineCount: metadata.totalLineCount,
      sourceRange,
      lineRanges: metadata.lineRanges
        .slice(fromLine, toLine)
        .map((range) => ({
          from: range.from - firstLine.from,
          to: range.to - firstLine.from,
        })),
    },
  };
}

function getLeadingGap(
  currentPage: WorkingPagePlan,
  unit: DocumentLayoutUnit,
  blockGap: number,
) {
  if (currentPage.units.length === 0) {
    return 0;
  }

  return currentPage.units.at(-1)?.kind === "blankSpace" ||
    (unit.kind === "blankSpace" &&
      unit.blankSpaceMetadata?.boundary === "trailing")
    ? 0
    : blockGap;
}

export function paginateDocument(
  units: DocumentLayoutUnit[],
  measurements: MeasuredLayoutUnit[],
  pageContentHeight: number,
  blockGap = 0,
  paragraphProfiles: ParagraphMeasurementProfile[] = [],
  listProfiles: ListMeasurementProfile[] = [],
  codeProfiles: CodeMeasurementProfile[] = [],
  blankSpaceProfiles: BlankSpaceMeasurementProfile[] = [],
) {
  if (units.length === 0) {
    return [
      {
        id: "page-1",
        fragments: [],
        contentHeight: 0,
        isOversized: false,
      },
    ] satisfies DocumentPagePlan[];
  }

  const heights = new Map(
    measurements.map((measurement) => [measurement.id, measurement.height]),
  );
  const profiles = new Map(
    paragraphProfiles.map((profile) => [profile.unitId, profile]),
  );
  const listProfileMap = new Map(
    listProfiles.map((profile) => [profile.unitId, profile]),
  );
  const codeProfileMap = new Map(
    codeProfiles.map((profile) => [profile.unitId, profile]),
  );
  const blankSpaceProfileMap = new Map(
    blankSpaceProfiles.map((profile) => [profile.unitId, profile]),
  );

  if (
    units.some(
      (unit) =>
        !heights.has(unit.id) ||
        (unit.splittingStrategy === "paragraph" &&
          (!profiles.has(unit.id) ||
            profiles.get(unit.id)?.sourceLength !== unit.source.length)) ||
        (unit.splittingStrategy === "list" &&
          (!unit.listMetadata ||
            !listProfileMap.has(unit.id) ||
            listProfileMap.get(unit.id)?.itemCount !==
              unit.listMetadata.items.length)) ||
        (unit.splittingStrategy === "blankSpace" &&
          (!unit.blankSpaceMetadata ||
            !blankSpaceProfileMap.has(unit.id) ||
            blankSpaceProfileMap.get(unit.id)?.lineCount !==
              unit.blankSpaceMetadata.lineCount)),
    )
  ) {
    return [] satisfies DocumentPagePlan[];
  }

  const getUnitHeight = (unit: DocumentLayoutUnit) => {
    switch (unit.splittingStrategy) {
      case "paragraph":
        return profiles.get(unit.id)?.fullHeight;
      case "list":
        return listProfileMap.get(unit.id)?.fullHeight;
      case "blankSpace":
        return blankSpaceProfileMap.get(unit.id)?.fullHeight;
      default:
        return heights.get(unit.id);
    }
  };
  const getStrategy = (unit: DocumentLayoutUnit) =>
    resolvePreviewStrategy(unit, {
      codeProfiles: codeProfileMap,
      getFallbackHeight: (candidate) => heights.get(candidate.id),
    });
  const pages: WorkingPagePlan[] = [];
  const allFragmentUnits: DocumentLayoutUnit[] = [];
  let currentPage: WorkingPagePlan = {
    id: "page-1",
    units: [],
    contentHeight: 0,
    isOversized: false,
  };
  let usedHeight = 0;

  const finishCurrentPage = () => {
    pages.push(currentPage);
    currentPage = {
      id: `page-${pages.length + 1}`,
      units: [],
      contentHeight: 0,
      isOversized: false,
    };
    usedHeight = 0;
  };

  const addUnitToCurrentPage = (
    unit: DocumentLayoutUnit,
    height: number,
  ) => {
    const appliedGap = getLeadingGap(currentPage, unit, blockGap);

    currentPage.units.push(unit);
    allFragmentUnits.push(unit);
    usedHeight += appliedGap + height;
    currentPage.contentHeight = usedHeight;

    if (height > pageContentHeight) {
      currentPage.isOversized = true;
    }
  };

  const addAtomicUnit = (unit: DocumentLayoutUnit, index: number) => {
    const unitHeight = getUnitHeight(unit);
    const nextUnit = units[index + 1];
    const nextUnitHeight = nextUnit
      ? nextUnit.splittingStrategy === "list"
        ? getListFragmentHeight(listProfileMap.get(nextUnit.id)!, 0, 1) ??
          getUnitHeight(nextUnit) ??
          0
        : nextUnit.splittingStrategy === "blankSpace"
          ? getBlankSpaceFragmentHeight(
              blankSpaceProfileMap.get(nextUnit.id)!,
              0,
              1,
            ) ??
            getUnitHeight(nextUnit) ??
            0
          : getStrategy(nextUnit)?.getFirstFragmentHeight?.(nextUnit) ??
            getUnitHeight(nextUnit) ??
            0
      : 0;
    const shouldKeepWithNext =
      unit.keepWithNext &&
      nextUnit !== undefined &&
      unit.kind !== "blankSpace" &&
      nextUnit.kind !== "blankSpace" &&
      unitHeight !== undefined &&
      unitHeight + blockGap + nextUnitHeight <= pageContentHeight;
    const leadingGap = getLeadingGap(currentPage, unit, blockGap);
    const neededHeight =
      leadingGap +
      (unitHeight ?? 0) +
      (shouldKeepWithNext ? blockGap + nextUnitHeight : 0);

    if (
      currentPage.units.length > 0 &&
      usedHeight + neededHeight > pageContentHeight
    ) {
      finishCurrentPage();
    }

    addUnitToCurrentPage(unit, unitHeight ?? 0);
  };

  const addStrategyUnit = (
    unit: DocumentLayoutUnit,
    strategy: PreviewStrategy,
  ) => {
    const session = strategy.createSession(unit);

    while (session.hasRemaining()) {
      const leadingGap = getLeadingGap(currentPage, unit, blockGap);
      const availableHeight = pageContentHeight - usedHeight - leadingGap;
      const result = session.fit({
        availableHeight,
        pageContentHeight,
        hasPageContent: currentPage.units.length > 0,
      });

      if (result.type === "break") {
        finishCurrentPage();
        continue;
      }

      addUnitToCurrentPage(result.fragment, result.height);

      if (session.hasRemaining()) {
        finishCurrentPage();
      }
    }
  };

  const addParagraphUnit = (unit: DocumentLayoutUnit) => {
    const profile = profiles.get(unit.id);

    if (!profile) {
      return;
    }

    if (profile.sourceLength === 0) {
      addUnitToCurrentPage(unit, profile.fullHeight);
      return;
    }

    let sourceOffset = 0;

    while (sourceOffset < profile.sourceLength) {
      const leadingGap = getLeadingGap(currentPage, unit, blockGap);
      const availableHeight = pageContentHeight - usedHeight - leadingGap;
      const remainingHeight = getParagraphSegmentHeight(
        profile,
        sourceOffset,
        profile.sourceLength,
      );

      if (remainingHeight !== null && remainingHeight <= availableHeight) {
        const fragment =
          sourceOffset === 0
            ? unit
            : createParagraphFragment(
                unit,
                sourceOffset,
                profile.sourceLength,
              );

        addUnitToCurrentPage(fragment, remainingHeight);
        sourceOffset = profile.sourceLength;
        continue;
      }

      const fit = getLargestFittingParagraphPrefix(
        profile,
        sourceOffset,
        availableHeight,
      );

      if (!fit) {
        break;
      }

      if (fit.isOversized && currentPage.units.length > 0) {
        finishCurrentPage();
        continue;
      }

      const fragment = createParagraphFragment(
        unit,
        sourceOffset,
        fit.point.sourceOffset,
      );
      addUnitToCurrentPage(fragment, fit.height);
      sourceOffset = fit.point.sourceOffset;

      if (sourceOffset < profile.sourceLength) {
        finishCurrentPage();
      }
    }
  };

  const addListUnit = (unit: DocumentLayoutUnit) => {
    const profile = listProfileMap.get(unit.id);

    if (!profile) {
      return;
    }

    let fromItem = 0;

    while (fromItem < profile.itemCount) {
      const leadingGap = getLeadingGap(currentPage, unit, blockGap);
      const availableHeight = pageContentHeight - usedHeight - leadingGap;
      const remainingHeight = getListFragmentHeight(
        profile,
        fromItem,
        profile.itemCount,
      );

      if (remainingHeight !== null && remainingHeight <= availableHeight) {
        const fragment =
          fromItem === 0
            ? unit
            : createListFragment(unit, fromItem, profile.itemCount);

        addUnitToCurrentPage(fragment, remainingHeight);
        fromItem = profile.itemCount;
        continue;
      }

      const fit = findLargestFittingListFragment(
        profile,
        fromItem,
        availableHeight,
      );

      if (!fit) {
        break;
      }

      if (fit.isOversized && currentPage.units.length > 0) {
        finishCurrentPage();
        continue;
      }

      addUnitToCurrentPage(
        createListFragment(unit, fromItem, fit.toItem),
        fit.height,
      );
      fromItem = fit.toItem;

      if (fromItem < profile.itemCount) {
        finishCurrentPage();
      }
    }
  };

  const addBlankSpaceUnit = (unit: DocumentLayoutUnit) => {
    const profile = blankSpaceProfileMap.get(unit.id);

    if (!profile) {
      return;
    }

    let fromLine = 0;

    while (fromLine < profile.lineCount) {
      const leadingGap = getLeadingGap(currentPage, unit, blockGap);
      const availableHeight = pageContentHeight - usedHeight - leadingGap;
      const remainingHeight = getBlankSpaceFragmentHeight(
        profile,
        fromLine,
        profile.lineCount,
      );

      if (remainingHeight !== null && remainingHeight <= availableHeight) {
        const fragment =
          fromLine === 0
            ? unit
            : createBlankSpaceFragment(unit, fromLine, profile.lineCount);

        addUnitToCurrentPage(fragment, remainingHeight);
        fromLine = profile.lineCount;
        continue;
      }

      const fit = findLargestFittingBlankSpace(
        profile,
        fromLine,
        availableHeight,
      );

      if (!fit) {
        break;
      }

      if (fit.isOversized && currentPage.units.length > 0) {
        finishCurrentPage();
        continue;
      }

      addUnitToCurrentPage(
        createBlankSpaceFragment(unit, fromLine, fit.toLine),
        fit.height,
      );
      fromLine = fit.toLine;

      if (fromLine < profile.lineCount) {
        finishCurrentPage();
      }
    }
  };

  units.forEach((unit, index) => {
    const strategy = getStrategy(unit);

    if (strategy) {
      addStrategyUnit(unit, strategy);
      return;
    }

    if (unit.splittingStrategy === "paragraph") {
      addParagraphUnit(unit);
      return;
    }

    if (unit.splittingStrategy === "list") {
      addListUnit(unit);
      return;
    }

    if (unit.splittingStrategy === "blankSpace") {
      addBlankSpaceUnit(unit);
      return;
    }

    addAtomicUnit(unit, index);
  });

  if (currentPage.units.length > 0 || pages.length === 0) {
    finishCurrentPage();
  }

  return pages.map((page) => ({
    id: page.id,
    fragments: createPageFragments(page.units, allFragmentUnits),
    contentHeight: page.contentHeight,
    isOversized: page.isOversized,
  })) satisfies DocumentPagePlan[];
}
