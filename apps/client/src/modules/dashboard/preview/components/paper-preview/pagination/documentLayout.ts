import type { Code, List, Paragraph, Table } from "mdast";

import type { DocumentBlock } from "@/modules/dashboard/document/model/document-block.types";
import type { ListLayoutMetadata } from "@/modules/dashboard/document/model/list.types";
import type {
  BlankSpaceLayoutMetadata,
  DocumentLayoutUnit,
  DocumentLayoutUnitKind,
} from "./pagination.types";
import { analyzeWhitespaceGap } from "./blankSpace";

function createLayoutUnit(
  block: DocumentBlock,
  kind: DocumentLayoutUnitKind,
  source: string,
  index = 0,
  details?: Partial<Pick<
    DocumentLayoutUnit,
    | "tableHeader"
    | "tableRow"
    | "sourceRange"
    | "sourceRepresentation"
     | "splittingStrategy"
     | "listMetadata"
     | "codeMetadata"
     | "blankSpaceMetadata"
  >>,
): DocumentLayoutUnit {
  return {
    id: `${block.id}-${kind}-${index}`,
    parentBlock: block,
    kind,
    source,
    sourceRange: { from: 0, to: block.source.length },
    sourceRepresentation: "direct",
    splittingStrategy: "atomic",
    keepWithNext: kind === "block" && block.keepWithNext,
    ...details,
  };
}

function getRelativeSourceRange(block: DocumentBlock, start: number, end: number) {
  const blockNodeStart = block.node.position?.start.offset;

  if (blockNodeStart === undefined) {
    return null;
  }

  return {
    from: start - blockNodeStart,
    to: end - blockNodeStart,
  };
}

export function getListLayoutMetadata(
  block: DocumentBlock,
): ListLayoutMetadata | null {
  if (block.kind !== "list") {
    return null;
  }

  const list = block.node as List;
  const items = list.children.map((item, index) => {
    const start = item.position?.start.offset;
    const end = item.position?.end.offset;
    const sourceRange =
      start !== undefined && end !== undefined
        ? getRelativeSourceRange(block, start, end)
        : null;

    return sourceRange
      ? {
          index,
          from: sourceRange.from,
          to: sourceRange.to,
        }
      : null;
  });

  if (
    list.children.length === 0 ||
    items.some(
      (item, index) =>
        item === null ||
        item.from < 0 ||
        item.to <= item.from ||
        item.to > block.source.length ||
        block.source.slice(item.from, item.to).trim().length === 0 ||
        (index > 0 && item.from <= (items[index - 1]?.to ?? -1)),
    )
  ) {
    return null;
  }

  return {
    ordered: list.ordered === true,
    start: list.ordered ? list.start ?? 1 : 1,
    spread: list.spread === true,
    items: items as ListLayoutMetadata["items"],
  };
}

export function isSplittableList(block: DocumentBlock) {
  return getListLayoutMetadata(block) !== null;
}

function getListUnits(block: DocumentBlock) {
  const listMetadata = getListLayoutMetadata(block);

  return listMetadata
    ? [
        createLayoutUnit(block, "block", block.source, 0, {
          listMetadata,
          splittingStrategy: "list",
        }),
      ]
    : [createLayoutUnit(block, "block", block.source)];
}

function getLineRanges(source: string) {
  const ranges: Array<{ from: number; to: number }> = [];
  let lineStart = 0;

  while (lineStart < source.length) {
    const newlineIndex = source.indexOf("\n", lineStart);
    const rawLineEnd = newlineIndex === -1 ? source.length : newlineIndex;
    const lineEnd =
      rawLineEnd > lineStart && source[rawLineEnd - 1] === "\r"
        ? rawLineEnd - 1
        : rawLineEnd;

    ranges.push({ from: lineStart, to: lineEnd });

    if (newlineIndex === -1) {
      break;
    }

    lineStart = newlineIndex + 1;
  }

  return ranges;
}

type SourceLine = {
  from: number;
  to: number;
  text: string;
  ending: string;
};

function getSourceLines(source: string): SourceLine[] {
  const lines: SourceLine[] = [];
  let lineStart = 0;

  while (lineStart < source.length) {
    const newlineIndex = source.indexOf("\n", lineStart);
    const textEnd = newlineIndex === -1 ? source.length : newlineIndex;
    const textWithoutCarriageReturn =
      textEnd > lineStart && source[textEnd - 1] === "\r"
        ? textEnd - 1
        : textEnd;
    const lineEnd = newlineIndex === -1 ? source.length : newlineIndex + 1;

    lines.push({
      from: lineStart,
      to: lineEnd,
      text: source.slice(lineStart, textWithoutCarriageReturn),
      ending: source.slice(textWithoutCarriageReturn, lineEnd),
    });
    lineStart = lineEnd;
  }

  return lines;
}

export function getCodeLayoutMetadata(
  block: DocumentBlock,
): NonNullable<DocumentLayoutUnit["codeMetadata"]> | null {
  if (block.kind !== "code" || block.node.type !== "code") {
    return null;
  }

  const code = block.node as Code;
  const sourceLines = getSourceLines(block.source);
  const openingLine = sourceLines[0];
  const openingMatch = openingLine?.text.match(
    /^([ \t]{0,3})(`{3,}|~{3,})([^\r\n]*)$/,
  );

  if (!openingLine || !openingMatch) {
    return null;
  }

  const closingIndex = sourceLines.findIndex((line, index) => {
    if (index === 0) {
      return false;
    }

    const closingMatch = line.text.match(
      /^([ \t]{0,3})(`{3,}|~{3,})([ \t]*)$/,
    );

    return (
      closingMatch !== null &&
      closingMatch[2][0] === openingMatch[2][0] &&
      closingMatch[2].length >= openingMatch[2].length
    );
  });

  if (closingIndex === -1) {
    return null;
  }

  const closingLine = sourceLines[closingIndex];
  const closingMatch = closingLine.text.match(
    /^([ \t]{0,3})(`{3,}|~{3,})([ \t]*)$/,
  );
  const contentLines = sourceLines.slice(1, closingIndex);
  const contentRange = {
    from: contentLines[0]?.from ?? openingLine.to,
    to: contentLines.at(-1)?.to ?? closingLine.from,
  };
  const rawContent = block.source.slice(contentRange.from, contentRange.to);
  const normalizedContent = rawContent.replace(/\r\n?/g, "\n");
  const normalizedCodeValue = code.value.replace(/\r\n?/g, "\n");
  const expectedSourceContent =
    contentLines.length > 0 ? `${normalizedCodeValue}\n` : "";

  const expectedLineCount =
    expectedSourceContent.length === 0
      ? 0
      : expectedSourceContent.split("\n").length - 1;

  if (
    !closingMatch ||
    contentLines.length !== expectedLineCount
  ) {
    return null;
  }

  const renderedContent = normalizedContent;
  const content = renderedContent.endsWith("\n")
    ? renderedContent.slice(0, -1)
    : renderedContent;

  return {
    openingIndent: openingMatch[1],
    openingFence: openingMatch[2],
    info: openingMatch[3],
    openingLineEnding: openingLine.ending,
    closingIndent: closingMatch[1],
    closingFence: closingMatch[2],
    closingSuffix: closingMatch[3],
    content,
    renderedContent,
    contentRange,
    lines: contentLines.map((line, index) => ({
      index,
      from: line.from,
      to: line.to,
    })),
  };
}

export function isSplittableCodeBlock(block: DocumentBlock) {
  return getCodeLayoutMetadata(block) !== null;
}

function getTableUnits(block: DocumentBlock) {
  const table = block.node as Table;
  const lines = block.source.trimEnd().split(/\r?\n/);
  const lineRanges = getLineRanges(block.source.trimEnd());

  if (table.children.length < 3 || lines.length < 3) {
    return [createLayoutUnit(block, "block", block.source)];
  }

  const tableHeader = lines.slice(0, 2).join("\n");
  const rows = lines
    .slice(2)
    .map((tableRow, index) => ({
      tableRow,
      sourceRange: lineRanges[index + 2],
    }))
    .filter(({ tableRow }) => tableRow.trim().length > 0);

  return rows.map(({ sourceRange, tableRow }, index) =>
    createLayoutUnit(
      block,
      "tableRow",
      `${tableHeader}\n${tableRow}`,
      index,
      {
        sourceRange,
        sourceRepresentation: "reconstructed",
        tableHeader,
        tableRow,
      },
    ),
  );
}

function getCodeUnits(block: DocumentBlock) {
  const codeMetadata = getCodeLayoutMetadata(block);

  return codeMetadata
    ? [
        createLayoutUnit(block, "block", block.source, 0, {
          codeMetadata,
          splittingStrategy: "code",
        }),
      ]
    : [createLayoutUnit(block, "block", block.source)];
}

function getParagraphUnits(block: DocumentBlock) {
  const paragraph = block.node as Paragraph;
  const isPlainText =
    paragraph.children.length > 0 &&
    paragraph.children.every((child) => child.type === "text");

  if (!isPlainText) {
    return [createLayoutUnit(block, "block", block.source)];
  }

  return [
    createLayoutUnit(block, "block", block.source, 0, {
      splittingStrategy: "paragraph",
    }),
  ];
}

function getUnitsForBlock(block: DocumentBlock) {
  switch (block.kind) {
    case "list":
      return getListUnits(block);
    case "table":
      return getTableUnits(block);
    case "code":
      return getCodeUnits(block);
    case "paragraph":
      return getParagraphUnits(block);
    default:
      return [createLayoutUnit(block, "block", block.source)];
  }
}

function createBlankSpaceUnit(
  anchorBlock: DocumentBlock,
  markdown: string,
  metadata: BlankSpaceLayoutMetadata,
) {
  const source = markdown.slice(metadata.sourceRange.from, metadata.sourceRange.to);

  return {
    id: `blank-space-${metadata.sourceRange.from}-${metadata.sourceRange.to}`,
    parentBlock: anchorBlock,
    kind: "blankSpace" as const,
    source,
    sourceRange: { from: 0, to: source.length },
    sourceRepresentation: "direct" as const,
    splittingStrategy: "blankSpace" as const,
    blankSpaceMetadata: metadata,
    keepWithNext: false,
  } satisfies DocumentLayoutUnit;
}

export function createDocumentLayoutUnits(
  blocks: DocumentBlock[],
  markdown = "",
) {
  if (blocks.length === 0) {
    return [];
  }

  const units: DocumentLayoutUnit[] = [];
  const firstBlock = blocks[0];
  const leadingMetadata = analyzeWhitespaceGap(
    markdown.slice(0, firstBlock.range.start),
    0,
    "leading",
  );

  if (leadingMetadata) {
    units.push(createBlankSpaceUnit(firstBlock, markdown, leadingMetadata));
  }

  blocks.forEach((block, index) => {
    units.push(...getUnitsForBlock(block));

    const nextBlock = blocks[index + 1];

    if (nextBlock) {
      const metadata = analyzeWhitespaceGap(
        markdown.slice(block.range.end, nextBlock.range.start),
        block.range.end,
        "between",
      );

      if (metadata) {
        units.push(createBlankSpaceUnit(nextBlock, markdown, metadata));
      }

      return;
    }

    const trailingMetadata = analyzeWhitespaceGap(
      markdown.slice(block.range.end),
      block.range.end,
      "trailing",
    );

    if (trailingMetadata) {
      units.push(createBlankSpaceUnit(block, markdown, trailingMetadata));
    }
  });

  return units;
}

export function getLayoutUnitSource(units: DocumentLayoutUnit[]) {
  if (units.length === 0) {
    return "";
  }

  const [firstUnit] = units;

  if (units.length === 1) {
    return firstUnit.source;
  }

  if (firstUnit.kind === "tableRow" && firstUnit.tableHeader) {
    return `${firstUnit.tableHeader}\n${units.map((unit) => unit.tableRow).join("\n")}`;
  }

  if (firstUnit.kind === "paragraphFragment") {
    return units.map((unit) => unit.source).join("");
  }

  if (firstUnit.kind === "listFragment") {
    return units
      .map((unit) => unit.source)
      .join(firstUnit.listMetadata?.spread ? "\n\n" : "\n");
  }

  return units.map((unit) => unit.source).join("\n");
}

function rewriteOrderedListItemSource(source: string, semanticNumber: number) {
  const firstLineEnd = source.indexOf("\n");
  const firstLine =
    firstLineEnd === -1 ? source : source.slice(0, firstLineEnd);
  const markerMatch = firstLine.match(/^(\s*)\d+([.)])([ \t]+)/);

  if (!markerMatch) {
    return source;
  }

  const replacement = `${markerMatch[1]}${semanticNumber}${markerMatch[2]}${markerMatch[3]}`;
  const rewrittenFirstLine = `${replacement}${firstLine.slice(markerMatch[0].length)}`;

  if (firstLineEnd === -1) {
    return rewrittenFirstLine;
  }

  const indentationDelta = replacement.length - markerMatch[0].length;
  const rest = source.slice(firstLineEnd + 1);
  const rewrittenRest = rest
    .split("\n")
    .map((line) => {
      if (indentationDelta === 0 || line.trim().length === 0) {
        return line;
      }

      if (indentationDelta > 0) {
        return `${" ".repeat(indentationDelta)}${line}`;
      }

      const leadingWhitespace = line.match(/^[ \t]*/)?.[0] ?? "";
      const removeCount = Math.min(
        leadingWhitespace.length,
        Math.abs(indentationDelta),
      );

      return line.slice(removeCount);
    })
    .join("\n");

  return `${rewrittenFirstLine}\n${rewrittenRest}`;
}

export function getListFragmentSource(
  unit: DocumentLayoutUnit,
  fromItem: number,
  toItem: number,
) {
  const metadata = unit.listMetadata;

  if (!metadata) {
    return unit.source;
  }

  const separator = metadata.spread ? "\n\n" : "\n";

  return metadata.items
    .slice(fromItem, toItem)
    .map((item) => {
      const itemSource = unit.parentBlock.source.slice(item.from, item.to);

      return metadata.ordered
        ? rewriteOrderedListItemSource(
            itemSource,
            metadata.start + item.index,
          )
        : itemSource;
    })
    .join(separator);
}

export { getCodeFragmentSource } from "./strategies/code/codeFragments";

export function getLayoutUnitBlock(unit: DocumentLayoutUnit): DocumentBlock {
  return {
    ...unit.parentBlock,
    id: unit.id,
    source: unit.source,
    editable: false,
    keepWithNext: unit.keepWithNext,
  };
}
