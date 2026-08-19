import type {
  ParagraphFitPoint,
  ParagraphMeasurementCandidate,
  ParagraphMeasurementProfile,
  BlockMeasurementUnit,
} from "./measurement.types";

function getWordBoundaryOffsets(source: string) {
  const offsets = new Set<number>();

  for (const token of source.matchAll(/\S+\s*/g)) {
    offsets.add((token.index ?? 0) + token[0].length);
  }

  offsets.add(source.length);

  return [...offsets].filter((offset) => offset > 0).sort((a, b) => a - b);
}

export function getParagraphMeasurementCandidates(
  unit: BlockMeasurementUnit,
): ParagraphMeasurementCandidate[] {
  if (
    unit.splittingStrategy !== "paragraph" &&
    unit.splittingStrategy !== "callout"
  ) {
    return [];
  }

  const measurementSource = unit.measurementSource ?? unit.source;

  return getWordBoundaryOffsets(measurementSource).map((sourceOffset) => ({
    id: `${unit.id}:paragraph:${sourceOffset}`,
    unitId: unit.id,
    parentBlockId: unit.parentBlockId,
    sourceOffset,
    source: unit.source.slice(0, sourceOffset),
    content: measurementSource.slice(0, sourceOffset),
  }));
}

export function createParagraphMeasurementProfile({
  unitId,
  parentBlockId,
  sourceLength,
  candidates,
  heights,
}: {
  unitId: string;
  parentBlockId: string;
  sourceLength: number;
  candidates: ParagraphMeasurementCandidate[];
  heights: Map<string, number>;
}): ParagraphMeasurementProfile | null {
  if (
    candidates.some(
      (candidate) =>
        !Number.isInteger(candidate.sourceOffset) ||
        candidate.sourceOffset <= 0 ||
        candidate.sourceOffset > sourceLength ||
        (candidate.content ?? candidate.source).length !==
          candidate.sourceOffset,
    )
  ) {
    return null;
  }

  const points = candidates
    .map((candidate) => ({
      sourceOffset: candidate.sourceOffset,
      height: heights.get(candidate.id),
    }))
    .sort((left, right) => left.sourceOffset - right.sourceOffset);

  if (
    points.length === 0 ||
    points.at(-1)?.sourceOffset !== sourceLength ||
    points.some(
      (point) =>
        point.height === undefined ||
        !Number.isFinite(point.height) ||
        point.height < 0,
    )
  ) {
    return null;
  }

  let previousOffset = 0;
  let previousHeight = 0;
  const fitPoints: ParagraphFitPoint[] = [
    { sourceOffset: 0, height: 0, isLineBoundary: true },
  ];

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const height = point.height as number;

    if (point.sourceOffset <= previousOffset || height < previousHeight) {
      return null;
    }

    const nextPoint = points[index + 1];

    fitPoints.push({
      sourceOffset: point.sourceOffset,
      height,
      isLineBoundary:
        point.sourceOffset === sourceLength ||
        (nextPoint?.height !== undefined && nextPoint.height > height),
    });

    previousOffset = point.sourceOffset;
    previousHeight = height;
  }

  return {
    unitId,
    parentBlockId,
    sourceLength,
    fullHeight: previousHeight,
    fitPoints,
  };
}

function getFitPointAtOffset(
  profile: ParagraphMeasurementProfile,
  sourceOffset: number,
) {
  return profile.fitPoints.find(
    (fitPoint) => fitPoint.sourceOffset === sourceOffset,
  );
}

export function getParagraphSegmentHeight(
  profile: ParagraphMeasurementProfile,
  from: number,
  to: number,
) {
  const startPoint = getFitPointAtOffset(profile, from);
  const endPoint = getFitPointAtOffset(profile, to);

  if (!startPoint || !endPoint || to <= from) {
    return null;
  }

  return endPoint.height - startPoint.height;
}

export function getLargestFittingParagraphPrefix(
  profile: ParagraphMeasurementProfile,
  from: number,
  availableHeight: number,
) {
  const candidates = profile.fitPoints.filter(
    (fitPoint) => fitPoint.sourceOffset > from,
  );

  if (candidates.length === 0) {
    return null;
  }

  const fittingCandidate = candidates
    .filter((candidate) => {
      const height = getParagraphSegmentHeight(
        profile,
        from,
        candidate.sourceOffset,
      );

      return height !== null && height <= availableHeight;
    })
    .at(-1);
  const point = fittingCandidate ?? candidates[0];
  const height = getParagraphSegmentHeight(profile, from, point.sourceOffset);

  if (height === null) {
    return null;
  }

  return {
    point,
    height,
    isOversized: height > availableHeight,
  };
}
