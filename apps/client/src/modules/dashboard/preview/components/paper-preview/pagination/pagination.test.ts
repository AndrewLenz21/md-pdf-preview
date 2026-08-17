import { describe, expect, it } from "vitest";

import { getPaperPreviewDimensions } from "../paper-sizes";
import { parseMarkdownDocument } from "@/modules/dashboard/document";
import {
  createParagraphMeasurementProfile,
  getParagraphMeasurementCandidates,
} from "@/modules/dashboard/preview/measurement/paragraphMeasurement";
import { createListMeasurementProfile } from "@/modules/dashboard/preview/measurement/listMeasurement";
import { getDocumentPageHeight } from "./document-layout";
import { createDocumentLayoutUnits } from "./documentLayout";
import { paginateDocument } from "./paginateDocument";

function measureUnits(
  units: ReturnType<typeof createDocumentLayoutUnits>,
  height: number,
) {
  return units.map((unit) => ({
    id: unit.id,
    height:
      unit.splittingStrategy === "list"
        ? height * (unit.listMetadata?.items.length ?? 1)
        : height,
  }));
}

function createParagraphProfiles(
  units: ReturnType<typeof createDocumentLayoutUnits>,
  measurements: ReturnType<typeof measureUnits>,
) {
  const heightById = new Map(
    measurements.map((measurement) => [measurement.id, measurement.height]),
  );

  return units.flatMap((unit) => {
    if (unit.splittingStrategy !== "paragraph") {
      return [];
    }

    const candidates = getParagraphMeasurementCandidates({
      id: unit.id,
      parentBlockId: unit.parentBlock.id,
      source: unit.source,
      splittingStrategy: unit.splittingStrategy,
    });
    const fullHeight = heightById.get(unit.id) ?? 0;
    const candidateHeights = new Map(
      candidates.map((candidate, index) => [
        candidate.id,
        (fullHeight * (index + 1)) / candidates.length,
      ]),
    );

    return [
      createParagraphMeasurementProfile({
        unitId: unit.id,
        parentBlockId: unit.parentBlock.id,
        sourceLength: unit.source.length,
        candidates,
        heights: candidateHeights,
      }),
    ];
  }).filter((profile) => profile !== null);
}

function createListProfiles(
  units: ReturnType<typeof createDocumentLayoutUnits>,
  measurements: ReturnType<typeof measureUnits>,
) {
  const heightById = new Map(
    measurements.map((measurement) => [measurement.id, measurement.height]),
  );

  return units.flatMap((unit) => {
    if (unit.splittingStrategy !== "list" || !unit.listMetadata) {
      return [];
    }

    const fullHeight = heightById.get(unit.id) ?? 0;
    const itemHeight = fullHeight / unit.listMetadata.items.length;

    return [
      createListMeasurementProfile({
        unitId: unit.id,
        parentBlockId: unit.parentBlock.id,
        metadata: unit.listMetadata,
        fullHeight,
        items: unit.listMetadata.items.map((sourceRange, index) => ({
          index,
          sourceRange,
          height: itemHeight,
          gapAfter: 0,
        })),
      }),
    ];
  }).filter((profile) => profile !== null);
}

function paginateWithProfiles(
  units: ReturnType<typeof createDocumentLayoutUnits>,
  measurements: ReturnType<typeof measureUnits>,
  pageContentHeight: number,
  blockGap = 0,
) {
  return paginateDocument(
    units,
    measurements,
    pageContentHeight,
    blockGap,
    createParagraphProfiles(units, measurements),
    createListProfiles(units, measurements),
  );
}

function getFragmentSourcesByParent(
  pages: ReturnType<typeof paginateDocument>,
) {
  const sourceByParent = new Map<string, string>();

  pages
    .flatMap((page) => page.fragments)
    .forEach((fragment) => {
      sourceByParent.set(
        fragment.parentBlockId,
        `${sourceByParent.get(fragment.parentBlockId) ?? ""}${fragment.source}`,
      );
    });

  return [...sourceByParent.values()];
}

describe("paper preview pagination", () => {
  it("reserves the footer outside the usable page content height", () => {
    const dimensions = getPaperPreviewDimensions("a4", 100);

    expect(dimensions.contentHeight).toBe(
      dimensions.baseHeight -
        dimensions.margins.top -
        dimensions.margins.bottom -
        dimensions.footerHeight,
    );
    expect(getDocumentPageHeight(dimensions.contentHeight, dimensions)).toBe(
      dimensions.baseHeight,
    );
  });

  it("keeps every normal page plan within its usable content height", () => {
    const units = createDocumentLayoutUnits(
      parseMarkdownDocument(
        "# Open questions\n\nFirst paragraph.\n\nSecond paragraph.\n\n- One\n- Two",
      ).blocks,
    );
    const pageContentHeight = 180;
    const pages = paginateWithProfiles(
      units,
      measureUnits(units, 80),
      pageContentHeight,
      14,
    );

    expect(pages.flatMap((page) => page.fragments).length).toBeGreaterThan(0);
    expect(
      pages.filter((page) => !page.isOversized).every(
        (page) => page.contentHeight <= pageContentHeight,
      ),
    ).toBe(true);
  });

  it("uses the same source units with different paper page capacities", () => {
    const markdown = Array.from({ length: 7 }, (_, index) => `Paragraph ${index + 1}`).join(
      "\n\n",
    );
    const units = createDocumentLayoutUnits(parseMarkdownDocument(markdown).blocks);
    const a4 = getPaperPreviewDimensions("a4", 100);
    const a5 = getPaperPreviewDimensions("a5", 100);
    const measurements = measureUnits(units, 100);
    const a4Pages = paginateWithProfiles(units, measurements, a4.contentHeight, a4.blockGap);
    const a5Pages = paginateWithProfiles(units, measurements, a5.contentHeight, a5.blockGap);

    expect(getFragmentSourcesByParent(a4Pages)).toEqual(
      getFragmentSourcesByParent(a5Pages),
    );
    expect(a4Pages.length).toBeLessThan(a5Pages.length);
  });

  it("keeps intrinsic pagination dimensions unchanged when Preview zoom changes", () => {
    const normal = getPaperPreviewDimensions("a4", 100);
    const zoomedOut = getPaperPreviewDimensions("a4", 50);

    expect(zoomedOut.contentWidth).toBe(normal.contentWidth);
    expect(zoomedOut.contentHeight).toBe(normal.contentHeight);
    expect(zoomedOut.scale).toBe(0.5);
  });

  it("does not paginate units with missing measurements", () => {
    const units = createDocumentLayoutUnits(
      parseMarkdownDocument("Measured content").blocks,
    );

    expect(paginateDocument(units, [], 400)).toEqual([]);
  });
});
