import type { PaperPreviewDimensions } from "../paper-sizes";

export function getDocumentPageHeight(
  contentHeight: number,
  dimensions: PaperPreviewDimensions,
) {
  return Math.max(
    dimensions.baseHeight,
    contentHeight +
      dimensions.margins.top +
      dimensions.margins.bottom +
      dimensions.footerHeight,
  );
}
