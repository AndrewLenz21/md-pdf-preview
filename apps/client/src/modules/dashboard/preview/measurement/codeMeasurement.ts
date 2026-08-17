import type { CodeLayoutMetadata } from "@/modules/dashboard/document/model/code.types";

import type {
  CodeMeasurementProfile,
  CodeMeasurementUnit,
  MeasuredCodeLine,
} from "./measurement.types";

type CodeLineGeometry = {
  top: number;
  bottom: number;
  lineHeight: number;
};

export function createCodeMeasurementProfile({
  unitId,
  parentBlockId,
  metadata,
  fullHeight,
  lines,
}: {
  unitId: string;
  parentBlockId: string;
  metadata: CodeLayoutMetadata;
  fullHeight: number;
  lines: MeasuredCodeLine[];
}): CodeMeasurementProfile | null {
  const metadataRangesAreValid = metadata.lines.every(
    (line, index) =>
      Number.isInteger(line.from) &&
      Number.isInteger(line.to) &&
      line.from >= metadata.contentRange.from &&
      line.to > line.from &&
      line.to <= metadata.contentRange.to &&
      (index === 0 || line.from === metadata.lines[index - 1].to),
  );

  if (
    !Number.isFinite(fullHeight) ||
    fullHeight < 0 ||
    !metadataRangesAreValid ||
    lines.length !== metadata.lines.length ||
    lines.some(
      (line, index) =>
        line.index !== index ||
        line.sourceRange.from !== metadata.lines[index]?.from ||
        line.sourceRange.to !== metadata.lines[index]?.to ||
        !Number.isInteger(line.sourceRange.from) ||
        !Number.isInteger(line.sourceRange.to) ||
        line.sourceRange.from < 0 ||
        line.sourceRange.to <= line.sourceRange.from ||
        !Number.isFinite(line.height) ||
        line.height < 0 ||
        !Number.isFinite(line.gapAfter) ||
        line.gapAfter < 0,
    )
  ) {
    return null;
  }

  const contentHeight = lines.reduce(
    (total, line, index) =>
      total + line.height + (index < lines.length - 1 ? line.gapAfter : 0),
    0,
  );
  const overhead = Math.max(0, fullHeight - contentHeight);

  if (!Number.isFinite(overhead)) {
    return null;
  }

  const lineHeightPrefix = [0];
  const gapPrefix = [0];

  lines.forEach((line, index) => {
    lineHeightPrefix.push(lineHeightPrefix[index] + line.height);
    gapPrefix.push(
      gapPrefix[index] +
        (index < lines.length - 1 ? line.gapAfter : 0),
    );
  });

  return {
    unitId,
    parentBlockId,
    lineCount: lines.length,
    fullHeight,
    overhead,
    lines,
    lineHeightPrefix,
    gapPrefix,
  };
}

export function getCodeFragmentHeight(
  profile: CodeMeasurementProfile,
  fromLine: number,
  toLine: number,
) {
  if (
    profile.lineCount === 0 &&
    fromLine === 0 &&
    toLine === 0
  ) {
    return profile.fullHeight;
  }

  if (
    !Number.isInteger(fromLine) ||
    !Number.isInteger(toLine) ||
    fromLine < 0 ||
    toLine <= fromLine ||
    toLine > profile.lineCount
  ) {
    return null;
  }

  const lineHeight =
    profile.lineHeightPrefix[toLine] - profile.lineHeightPrefix[fromLine];
  const gapHeight =
    toLine - fromLine > 1
      ? profile.gapPrefix[toLine - 1] - profile.gapPrefix[fromLine]
      : 0;

  return profile.overhead + lineHeight + gapHeight;
}

export function findLargestFittingCodeFragment(
  profile: CodeMeasurementProfile,
  fromLine: number,
  availableHeight: number,
) {
  if (fromLine < 0 || fromLine >= profile.lineCount) {
    return null;
  }

  const firstToLine = fromLine + 1;
  const firstHeight = getCodeFragmentHeight(profile, fromLine, firstToLine);

  if (firstHeight === null) {
    return null;
  }

  let low = firstToLine;
  let high = profile.lineCount;
  let toLine = firstToLine;
  let height = firstHeight;

  if (firstHeight <= availableHeight) {
    while (low <= high) {
      const midpoint = Math.floor((low + high) / 2);
      const midpointHeight = getCodeFragmentHeight(
        profile,
        fromLine,
        midpoint,
      );

      if (midpointHeight === null || midpointHeight > availableHeight) {
        high = midpoint - 1;
        continue;
      }

      toLine = midpoint;
      height = midpointHeight;
      low = midpoint + 1;
    }
  }

  if (height === null) {
    return null;
  }

  return {
    fromLine,
    toLine,
    height,
    isOversized: height > availableHeight,
  };
}

function getTextNodes(root: HTMLElement) {
  const nodes: Text[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, 4);
  let node = walker.nextNode();

  while (node) {
    if (node.nodeType === 3) {
      nodes.push(node as Text);
    }
    node = walker.nextNode();
  }

  return nodes;
}

function getTextPoint(nodes: Text[], offset: number) {
  let remaining = offset;

  for (const node of nodes) {
    const length = node.nodeValue?.length ?? 0;

    if (remaining <= length) {
      return { node, offset: remaining };
    }

    remaining -= length;
  }

  const lastNode = nodes.at(-1);

  return lastNode
    ? { node: lastNode, offset: lastNode.nodeValue?.length ?? 0 }
    : null;
}

function getRangeGeometry(
  nodes: Text[],
  start: number,
  end: number,
): CodeLineGeometry | null {
  const startPoint = getTextPoint(nodes, start);
  const endPoint = getTextPoint(nodes, end);

  if (!startPoint || !endPoint) {
    return null;
  }

  const range = nodes[0].ownerDocument.createRange();

  try {
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);
  } catch {
    return null;
  }

  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.height > 0,
  );

  if (rects.length === 0) {
    return null;
  }

  return {
    top: Math.min(...rects.map((rect) => rect.top)),
    bottom: Math.max(...rects.map((rect) => rect.bottom)),
    lineHeight: Math.min(...rects.map((rect) => rect.height)),
  };
}

function getComputedLineHeight(element: HTMLElement) {
  const view = element.ownerDocument.defaultView;

  if (!view) {
    return null;
  }

  const styles = view.getComputedStyle(element);
  const lineHeight = Number.parseFloat(styles.lineHeight);
  const fontSize = Number.parseFloat(styles.fontSize);

  if (styles.lineHeight === "normal") {
    return Number.isFinite(fontSize) && fontSize > 0 ? fontSize * 1.2 : null;
  }

  if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
    return null;
  }

  return styles.lineHeight === "normal" || !styles.lineHeight.endsWith("px")
    ? Number.isFinite(fontSize) && fontSize > 0
      ? lineHeight * fontSize
      : null
      : lineHeight;
}

function createFallbackCodeMeasurementProfile(
  unit: CodeMeasurementUnit,
  blockElement: HTMLElement,
  fullHeight: number,
) {
  const metadata = unit.codeMetadata;
  const codeElement = blockElement.querySelector<HTMLElement>("pre > code");
  const lineHeight = codeElement
    ? getComputedLineHeight(codeElement)
    : null;

  if (!metadata || !codeElement || !lineHeight || lineHeight <= 0) {
    return null;
  }

  return createCodeMeasurementProfile({
    unitId: unit.id,
    parentBlockId: unit.parentBlockId,
    metadata,
    fullHeight,
    lines: metadata.lines.map((sourceRange, index) => ({
      index,
      sourceRange,
      height: lineHeight,
      gapAfter: 0,
    })),
  });
}

function fillMissingLineGeometry(
  geometries: Array<CodeLineGeometry | null>,
  lineHeight: number,
) {
  const resolved = [...geometries];

  for (let index = 0; index < resolved.length; index += 1) {
    if (resolved[index]) {
      continue;
    }

    const previous = resolved[index - 1];

    if (previous) {
      resolved[index] = {
        top: previous.bottom,
        bottom: previous.bottom + lineHeight,
        lineHeight,
      };
      continue;
    }

    const nextIndex = resolved.findIndex(
      (geometry, candidateIndex) =>
        candidateIndex > index && geometry !== null,
    );
    const next = nextIndex === -1 ? null : resolved[nextIndex];

    if (!next) {
      resolved[index] = {
        top: 0,
        bottom: lineHeight,
        lineHeight,
      };
      continue;
    }

    const bottom = next.top - (nextIndex - index - 1) * lineHeight;

    resolved[index] = {
      top: bottom - lineHeight,
      bottom,
      lineHeight,
    };
  }

  return resolved as CodeLineGeometry[];
}

export function measureCodeBlock(
  blockElement: HTMLElement,
  unit: CodeMeasurementUnit,
  fullHeight: number,
) {
  const codeElement = blockElement.querySelector<HTMLElement>("pre > code");

  if (!codeElement) {
    return null;
  }

  const metadata = unit.codeMetadata;

  if (metadata.lines.length === 0) {
    return createCodeMeasurementProfile({
      unitId: unit.id,
      parentBlockId: unit.parentBlockId,
      metadata,
      fullHeight,
      lines: [],
    });
  }

  const textNodes = getTextNodes(codeElement);
  const renderedContent = textNodes
    .map((node) => node.nodeValue ?? "")
    .join("");

  const rendererSuffix = renderedContent.slice(metadata.content.length);
  const expectedRendererSuffix = metadata.renderedContent.slice(
    metadata.content.length,
  );

  if (
    renderedContent !== metadata.renderedContent ||
    !renderedContent.startsWith(metadata.content) ||
    rendererSuffix !== expectedRendererSuffix
  ) {
    return createFallbackCodeMeasurementProfile(unit, blockElement, fullHeight);
  }

  const logicalLines = metadata.content.split("\n");

  if (logicalLines.length !== metadata.lines.length) {
    return createFallbackCodeMeasurementProfile(unit, blockElement, fullHeight);
  }

  const lineStarts: number[] = [];
  let contentOffset = 0;

  logicalLines.forEach((line, index) => {
    lineStarts[index] = contentOffset;
    contentOffset += line.length + (index < logicalLines.length - 1 ? 1 : 0);
  });

  if (contentOffset !== metadata.content.length) {
    return createFallbackCodeMeasurementProfile(unit, blockElement, fullHeight);
  }

  const geometries = logicalLines.map((line, index) => {
    const start = lineStarts[index];
    const textEnd = start + line.length;
    const end =
      line.length === 0 && index < logicalLines.length - 1
        ? textEnd + 1
        : textEnd;

    return getRangeGeometry(textNodes, start, end);
  });
  const knownLineHeight = geometries.find((geometry) => geometry !== null);
  const lineHeight =
    getComputedLineHeight(codeElement) ??
    (knownLineHeight ? knownLineHeight.lineHeight : null);

  if (!lineHeight || lineHeight <= 0) {
    return null;
  }

  const resolvedGeometries = fillMissingLineGeometry(geometries, lineHeight);

  if (!resolvedGeometries) {
    return null;
  }

  const lines: MeasuredCodeLine[] = resolvedGeometries.map(
    (geometry, index) => ({
      index,
      sourceRange: metadata.lines[index],
      height: geometry.bottom - geometry.top,
      gapAfter:
        index < resolvedGeometries.length - 1
          ? Math.max(
              0,
              resolvedGeometries[index + 1].top - geometry.bottom,
            )
          : 0,
    }),
  );

  return createCodeMeasurementProfile({
    unitId: unit.id,
    parentBlockId: unit.parentBlockId,
    metadata,
    fullHeight,
    lines,
  }) ?? createFallbackCodeMeasurementProfile(unit, blockElement, fullHeight);
}
