import type {
  BlankSpaceLayoutMetadata,
  DocumentSourceRange,
} from "./pagination.types";

type WhitespaceLineRange = DocumentSourceRange;

function getLineRanges(source: string, sourceStart: number) {
  const ranges: WhitespaceLineRange[] = [];
  let lineStart = 0;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (character !== "\n" && character !== "\r") {
      continue;
    }

    const endingLength = character === "\r" && source[index + 1] === "\n" ? 2 : 1;
    ranges.push({
      from: sourceStart + lineStart,
      to: sourceStart + index + endingLength,
    });
    lineStart = index + endingLength;

    if (endingLength === 2) {
      index += 1;
    }
  }

  if (lineStart < source.length) {
    ranges.push({
      from: sourceStart + lineStart,
      to: sourceStart + source.length,
    });
  }

  return ranges;
}

export function analyzeWhitespaceGap(
  gap: string,
  sourceStart: number,
  boundary: "leading" | "between" | "trailing",
): BlankSpaceLayoutMetadata | null {
  if (gap.length === 0 || !/^[ \t\r\n]*$/.test(gap)) {
    return null;
  }

  const lineRanges = getLineRanges(gap, sourceStart);
  const normalLineCount = boundary === "between" ? 2 : 1;
  const extraLineRanges = lineRanges.slice(normalLineCount);

  if (extraLineRanges.length === 0) {
    return null;
  }

  const sourceRange = {
    from: extraLineRanges[0].from,
    to: extraLineRanges.at(-1)?.to ?? extraLineRanges[0].to,
  };

  return {
    boundary,
    lineCount: extraLineRanges.length,
    startLine: 0,
    totalLineCount: extraLineRanges.length,
    sourceRange,
    lineRanges: extraLineRanges.map((range) => ({
      from: range.from - sourceRange.from,
      to: range.to - sourceRange.from,
    })),
  };
}
