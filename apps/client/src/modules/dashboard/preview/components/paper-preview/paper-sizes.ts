import type { PaperSize } from "@/modules/dashboard/types/paper.types";

export type PaperDimensionUnit = "mm" | "in";

export type PaperPageMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type PaperSizeDefinition = {
  label: string;
  width: number;
  height: number;
  unit: PaperDimensionUnit;
  margins: PaperPageMargins;
  footerHeight: number;
  blockGap: number;
  pageGap: number;
};

const DEFAULT_PAGE_MARGINS = {
  top: 72,
  right: 72,
  bottom: 56,
  left: 72,
} satisfies PaperPageMargins;

const DEFAULT_FOOTER_HEIGHT = 36;
const DEFAULT_BLOCK_GAP = 14;
const DEFAULT_PAGE_GAP = 32;

function createPaperDefinition(
  definition: Omit<
    PaperSizeDefinition,
    "margins" | "footerHeight" | "blockGap" | "pageGap"
  >,
): PaperSizeDefinition {
  return {
    ...definition,
    margins: DEFAULT_PAGE_MARGINS,
    footerHeight: DEFAULT_FOOTER_HEIGHT,
    blockGap: DEFAULT_BLOCK_GAP,
    pageGap: DEFAULT_PAGE_GAP,
  };
}

export const PAPER_SIZES: Record<PaperSize, PaperSizeDefinition> = {
  a4: createPaperDefinition({
    label: "A4",
    width: 210,
    height: 297,
    unit: "mm",
  }),
  a5: createPaperDefinition({
    label: "A5",
    width: 148,
    height: 210,
    unit: "mm",
  }),
  letter: createPaperDefinition({
    label: "Letter",
    width: 8.5,
    height: 11,
    unit: "in",
  }),
  legal: createPaperDefinition({
    label: "Legal",
    width: 8.5,
    height: 14,
    unit: "in",
  }),
};

export const PAPER_SIZE_OPTIONS = Object.entries(PAPER_SIZES).map(
  ([value, definition]) => ({
    value: value as PaperSize,
    label: definition.label,
    dimensions: `${definition.width} × ${definition.height} ${definition.unit}`,
  }),
);

const MILLIMETERS_PER_INCH = 25.4;
const CSS_PIXELS_PER_INCH = 96;

function toMillimeters(value: number, unit: PaperDimensionUnit) {
  return unit === "in" ? value * MILLIMETERS_PER_INCH : value;
}

export type PaperPreviewDimensions = {
  baseWidth: number;
  baseHeight: number;
  width: number;
  height: number;
  scale: number;
  contentWidth: number;
  contentHeight: number;
  margins: PaperPageMargins;
  footerHeight: number;
  blockGap: number;
  pageGap: number;
  printWidth: string;
  printHeight: string;
};

export function getPaperPreviewDimensions(
  paperSize: PaperSize,
  zoom: number,
): PaperPreviewDimensions {
  const definition = PAPER_SIZES[paperSize];
  const widthInInches =
    toMillimeters(definition.width, definition.unit) / MILLIMETERS_PER_INCH;
  const heightInInches =
    toMillimeters(definition.height, definition.unit) / MILLIMETERS_PER_INCH;
  const baseWidth = widthInInches * CSS_PIXELS_PER_INCH;
  const baseHeight = heightInInches * CSS_PIXELS_PER_INCH;
  const scale = zoom / 100;
  const { margins, footerHeight, blockGap } = definition;

  return {
    baseWidth,
    baseHeight,
    width: baseWidth * scale,
    height: baseHeight * scale,
    scale,
    contentWidth: baseWidth - margins.left - margins.right,
    contentHeight: baseHeight - margins.top - margins.bottom - footerHeight,
    margins,
    footerHeight,
    blockGap,
    pageGap: definition.pageGap,
    printWidth: `${definition.width}${definition.unit}`,
    printHeight: `${definition.height}${definition.unit}`,
  };
}

export function getPaperContentCssVariables(
  dimensions: PaperPreviewDimensions,
) {
  return {
    "--document-page-margin-top": `${dimensions.margins.top}px`,
    "--document-page-margin-right": `${dimensions.margins.right}px`,
    "--document-page-margin-bottom": `${dimensions.margins.bottom}px`,
    "--document-page-margin-left": `${dimensions.margins.left}px`,
    "--document-page-footer-height": `${dimensions.footerHeight}px`,
    "--document-block-gap": `${dimensions.blockGap}px`,
    "--document-page-gap": `${dimensions.pageGap}px`,
  };
}

export function isPaperSize(value: string): value is PaperSize {
  return value in PAPER_SIZES;
}
