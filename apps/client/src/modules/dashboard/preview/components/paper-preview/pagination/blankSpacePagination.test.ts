import { describe, expect, it } from "vitest";

import { parseMarkdownDocument } from "@/modules/dashboard/document";

import { createDocumentLayoutUnits } from "./documentLayout";
import { paginateDocument } from "./paginateDocument";

function paginateBlankSpace(markdown: string, pageContentHeight: number) {
  const units = createDocumentLayoutUnits(
    parseMarkdownDocument(markdown).blocks,
    markdown,
  );
  const blankSpaceUnit = units.find((unit) => unit.kind === "blankSpace");

  if (!blankSpaceUnit?.blankSpaceMetadata) {
    throw new Error("Expected a blank-space layout unit");
  }

  const lineCount = blankSpaceUnit.blankSpaceMetadata.lineCount;
  const blankSpaceHeight = lineCount * 20;
  const profile = {
    unitId: blankSpaceUnit.id,
    parentBlockId: blankSpaceUnit.parentBlock.id,
    lineCount,
    fullHeight: blankSpaceHeight,
    lineHeight: 20,
  };
  const measurements = units.map((unit) => ({
    id: unit.id,
    height: unit.id === blankSpaceUnit.id ? blankSpaceHeight : 40,
  }));

  return paginateDocument(
    units,
    measurements,
    pageContentHeight,
    14,
    [],
    [],
    [],
    [profile],
  );
}

describe("blank-space pagination", () => {
  it("does not add a semantic block gap before trailing whitespace", () => {
    const pages = paginateBlankSpace("# A\n\n", 100);

    expect(pages).toHaveLength(1);
    expect(pages[0].contentHeight).toBe(60);
    expect(pages[0].fragments.map((fragment) => fragment.kind)).toEqual([
      "heading",
      "blankSpace",
    ]);
  });

  it("consumes remaining space and continues the spacer before the heading", () => {
    const pages = paginateBlankSpace("# A\n\n\n\n\n# B", 100);

    expect(pages).toHaveLength(2);
    expect(pages[0].fragments.map((fragment) => fragment.kind)).toEqual([
      "heading",
      "blankSpace",
    ]);
    expect(pages[1].fragments.map((fragment) => fragment.kind)).toEqual([
      "blankSpace",
      "heading",
    ]);
    expect(pages[0].fragments[1].blankSpace).toMatchObject({
      lineCount: 2,
      startLine: 0,
      totalLineCount: 3,
    });
    expect(pages[1].fragments[0].blankSpace).toMatchObject({
      lineCount: 1,
      startLine: 2,
      totalLineCount: 3,
    });
    expect(
      pages
        .flatMap((page) => page.fragments)
        .filter((fragment) => fragment.kind === "blankSpace")
        .map((fragment) => fragment.sourceRange),
    ).toEqual([
      { from: 5, to: 7 },
      { from: 7, to: 8 },
    ]);
    expect(pages.every((page) => !page.isOversized)).toBe(true);
  });

  it("paginates a large blank-space run across normal pages", () => {
    const pages = paginateBlankSpace(
      ["# A", ...Array.from({ length: 11 }, () => ""), "# B"].join("\n"),
      100,
    );

    expect(pages.length).toBeGreaterThan(2);
    expect(pages.every((page) => !page.isOversized)).toBe(true);
    expect(
      pages
        .flatMap((page) => page.fragments)
        .filter((fragment) => fragment.kind === "blankSpace")
        .reduce((total, fragment) => total + (fragment.blankSpace?.lineCount ?? 0), 0),
    ).toBe(10);
  });
});
