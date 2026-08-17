import type { DocumentLayoutUnit } from "../../pagination.types";

export function getCodeFragmentSource(
  unit: DocumentLayoutUnit,
  fromLine: number,
  toLine: number,
) {
  const metadata = unit.codeMetadata;
  const firstLine = metadata?.lines[fromLine];
  const lastLine = metadata?.lines[toLine - 1];

  if (!metadata || !firstLine || !lastLine) {
    return unit.source;
  }

  const content = unit.parentBlock.source.slice(firstLine.from, lastLine.to);

  return `${metadata.openingIndent}${metadata.openingFence}${metadata.info}${metadata.openingLineEnding}${content}${metadata.closingIndent}${metadata.closingFence}${metadata.closingSuffix}`;
}

export function createCodeFragment(
  unit: DocumentLayoutUnit,
  fromLine: number,
  toLine: number,
) {
  const metadata = unit.codeMetadata;
  const firstLine = metadata?.lines[fromLine];
  const lastLine = metadata?.lines[toLine - 1];

  if (!metadata || !firstLine || !lastLine) {
    return unit;
  }

  return {
    ...unit,
    id: `${unit.id}:code:${fromLine}-${toLine}`,
    kind: "codeFragment" as const,
    source: getCodeFragmentSource(unit, fromLine, toLine),
    sourceRange: {
      from: firstLine.from,
      to: lastLine.to,
    },
    sourceRepresentation: "reconstructed" as const,
    splittingStrategy: "atomic" as const,
    keepWithNext: false,
  };
}
