import type { BlankSpaceMeasurementProfile } from "./measurement.types";

export function getBlankSpaceFragmentHeight(
  profile: BlankSpaceMeasurementProfile,
  fromLine: number,
  toLine: number,
) {
  if (
    !Number.isInteger(fromLine) ||
    !Number.isInteger(toLine) ||
    fromLine < 0 ||
    toLine <= fromLine ||
    toLine > profile.lineCount
  ) {
    return null;
  }

  return (toLine - fromLine) * profile.lineHeight;
}

export function findLargestFittingBlankSpace(
  profile: BlankSpaceMeasurementProfile,
  fromLine: number,
  availableHeight: number,
) {
  if (
    fromLine < 0 ||
    fromLine >= profile.lineCount ||
    !Number.isFinite(availableHeight)
  ) {
    return null;
  }

  const firstHeight = getBlankSpaceFragmentHeight(profile, fromLine, fromLine + 1);

  if (firstHeight === null) {
    return null;
  }

  const fittingLineCount =
    firstHeight <= availableHeight
      ? Math.floor(availableHeight / profile.lineHeight)
      : 1;
  const toLine = Math.min(
    profile.lineCount,
    fromLine + Math.max(1, fittingLineCount),
  );
  const height = getBlankSpaceFragmentHeight(profile, fromLine, toLine);

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
