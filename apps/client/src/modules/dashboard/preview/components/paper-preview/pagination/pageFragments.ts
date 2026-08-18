import type { DocumentLayoutUnit, PageFragment } from "./pagination.types";
import { getLayoutUnitSource } from "./documentLayout";

function getContinuation(
  group: DocumentLayoutUnit[],
  allUnits: DocumentLayoutUnit[],
) {
  const parentBlockId = group[0].parentBlock.id;
  const parentUnits = allUnits.filter(
    (unit) =>
      unit.kind !== "blankSpace" && unit.parentBlock.id === parentBlockId,
  );
  const firstIndex = parentUnits.findIndex(
    (unit) => unit.id === group[0].id,
  );
  const lastIndex = parentUnits.findIndex(
    (unit) => unit.id === group[group.length - 1].id,
  );

  if (
    parentUnits.length === 1 ||
    (firstIndex === 0 && lastIndex === parentUnits.length - 1)
  ) {
    return "none" as const;
  }

  if (firstIndex === 0) {
    return "start" as const;
  }

  if (lastIndex === parentUnits.length - 1) {
    return "end" as const;
  }

  return "middle" as const;
}

function getBlankSpaceContinuation(unit: DocumentLayoutUnit) {
  const metadata = unit.blankSpaceMetadata;

  if (!metadata || metadata.totalLineCount === metadata.lineCount) {
    return "none" as const;
  }

  if (metadata.startLine === 0) {
    return "start" as const;
  }

  if (metadata.startLine + metadata.lineCount >= metadata.totalLineCount) {
    return "end" as const;
  }

  return "middle" as const;
}

function createBlankSpaceFragment(unit: DocumentLayoutUnit) {
  const metadata = unit.blankSpaceMetadata;

  if (!metadata) {
    return null;
  }

  return {
    id: `${unit.id}:${metadata.sourceRange.from}-${metadata.sourceRange.to}`,
    parentBlockId: unit.parentBlock.id,
    kind: "blankSpace" as const,
    source: unit.source,
    sourceRange: metadata.sourceRange,
    sourceRepresentation: "direct" as const,
    continuation: getBlankSpaceContinuation(unit),
    editable: false,
    blankSpace: {
      boundary: metadata.boundary,
      lineCount: metadata.lineCount,
      startLine: metadata.startLine,
      totalLineCount: metadata.totalLineCount,
      sourceRange: metadata.sourceRange,
    },
  } satisfies PageFragment;
}

function getFragmentRange(
  units: DocumentLayoutUnit[],
  source: string,
  isCompleteBlock: boolean,
) {
  const parentBlock = units[0].parentBlock;

  if (isCompleteBlock) {
    return {
      sourceRange: { from: 0, to: parentBlock.source.length },
      sourceRepresentation: "direct" as const,
    };
  }

  const from = Math.min(...units.map((unit) => unit.sourceRange.from));
  const to = Math.max(...units.map((unit) => unit.sourceRange.to));
  const isDirectSource = parentBlock.source.slice(from, to) === source;

  return {
    sourceRange: { from, to },
    sourceRepresentation: isDirectSource
      ? ("direct" as const)
      : ("reconstructed" as const),
  };
}

function createPageFragment(
  units: DocumentLayoutUnit[],
  allUnits: DocumentLayoutUnit[],
) {
  const parentBlock = units[0].parentBlock;
  const totalUnits = allUnits.filter(
    (unit) =>
      unit.kind !== "blankSpace" && unit.parentBlock.id === parentBlock.id,
  ).length;
  const isCompleteBlock =
    units.length === totalUnits &&
    !units.some((unit) =>
      ["paragraphFragment", "listFragment", "codeFragment"].includes(
        unit.kind,
      ),
    );
  const source = isCompleteBlock
    ? parentBlock.source
    : getLayoutUnitSource(units);
  const { sourceRange, sourceRepresentation } = getFragmentRange(
    units,
    source,
    isCompleteBlock,
  );
  const id = `${parentBlock.id}:${parentBlock.kind}:${sourceRange.from}-${sourceRange.to}`;

  return {
    id,
    parentBlockId: parentBlock.id,
    kind: parentBlock.kind,
    source,
    sourceRange,
    sourceRepresentation,
    continuation: getContinuation(units, allUnits),
    editable: parentBlock.editable,
  } satisfies PageFragment;
}

export function createPageFragments(
  pageUnits: DocumentLayoutUnit[],
  allUnits: DocumentLayoutUnit[],
) {
  const unitGroups: DocumentLayoutUnit[][] = [];

  pageUnits.forEach((unit) => {
    if (unit.kind === "blankSpace") {
      unitGroups.push([unit]);
      return;
    }

    const currentGroup = unitGroups[unitGroups.length - 1];

    if (
      currentGroup &&
      currentGroup[0].parentBlock.id === unit.parentBlock.id &&
      currentGroup[0].kind === unit.kind
    ) {
      currentGroup.push(unit);
      return;
    }

    unitGroups.push([unit]);
  });

  const fragments: PageFragment[] = [];

  unitGroups.forEach((units) => {
    if (units[0].kind === "blankSpace") {
      const fragment = createBlankSpaceFragment(units[0]);

      if (fragment) {
        fragments.push(fragment);
      }

      return;
    }

    fragments.push(createPageFragment(units, allUnits));
  });

  return fragments;
}
