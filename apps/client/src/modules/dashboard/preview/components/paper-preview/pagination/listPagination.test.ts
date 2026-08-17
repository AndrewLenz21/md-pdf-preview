import { describe, expect, it } from "vitest";

import { parseMarkdownDocument } from "@/modules/dashboard/document";
import { createListMeasurementProfile } from "@/modules/dashboard/preview/measurement/listMeasurement";

import { createDocumentLayoutUnits } from "./documentLayout";
import { paginateDocument } from "./paginateDocument";

function createListPlan(
  markdown: string,
  itemHeights: number[],
  pageContentHeight: number,
  blockGap = 14,
  gapsAfter: number[] = itemHeights.map(() => 0),
) {
  const parsed = parseMarkdownDocument(markdown);
  const units = createDocumentLayoutUnits(parsed.blocks);
  const listUnit = units.find((unit) => unit.splittingStrategy === "list");

  if (!listUnit?.listMetadata) {
    throw new Error("Expected a splittable list unit");
  }

  const fullHeight = itemHeights.reduce(
    (total, height, index) =>
      total + height + (index < itemHeights.length - 1 ? gapsAfter[index] : 0),
    0,
  );
  const profile = createListMeasurementProfile({
    unitId: listUnit.id,
    parentBlockId: listUnit.parentBlock.id,
    metadata: listUnit.listMetadata,
    fullHeight,
    items: listUnit.listMetadata.items.map((sourceRange, index) => ({
      index,
      sourceRange,
      height: itemHeights[index],
      gapAfter: gapsAfter[index] ?? 0,
    })),
  });

  if (!profile) {
    throw new Error("Expected a valid list profile");
  }

  return {
    units,
    listUnit,
    pages: paginateDocument(
      units,
      units.map((unit) => ({
        id: unit.id,
        height: unit.id === listUnit.id ? fullHeight : 80,
      })),
      pageContentHeight,
      blockGap,
      [],
      [profile],
    ),
  };
}

describe("semantic list pagination", () => {
  it("keeps a short list as one complete fragment", () => {
    const { pages } = createListPlan("- One\n- Two", [30, 30], 100, 14);

    expect(pages).toHaveLength(1);
    expect(pages[0].fragments).toHaveLength(1);
    expect(pages[0].fragments[0].continuation).toBe("none");
    expect(pages[0].fragments[0].sourceRepresentation).toBe("direct");
  });

  it("fits the largest contiguous unordered-item prefix at an exact boundary", () => {
    const { pages, listUnit } = createListPlan(
      "- Alpha\n- Beta\n- Gamma\n- Delta",
      [70, 65, 75, 70],
      220,
      14,
      [5, 5, 5, 0],
    );
    const fragments = pages.flatMap((page) => page.fragments);

    expect(fragments).toHaveLength(2);
    expect(pages.map((page) => page.fragments.length)).toEqual([1, 1]);
    expect(fragments[0].source).toBe("- Alpha\n- Beta\n- Gamma");
    expect(fragments[1].source).toBe("- Delta");
    expect(pages.map((page) => page.contentHeight)).toEqual([220, 70]);
    expect(fragments.map((fragment) => fragment.sourceRange)).toEqual([
      {
        from: 0,
        to: listUnit.listMetadata?.items[2].to,
      },
      {
        from: listUnit.listMetadata?.items[3].from,
        to: listUnit.listMetadata?.items[3].to,
      },
    ]);
    expect(fragments.map((fragment) => fragment.continuation)).toEqual([
      "start",
      "end",
    ]);
    expect(fragments.every((fragment) => fragment.kind === "list")).toBe(true);
  });

  it("continues ordered lists from semantic start values and repeated source markers", () => {
    const repeated = createListPlan(
      "1. Alpha\n1. Beta\n1. Gamma\n1. Delta",
      [40, 40, 40, 40],
      80,
      0,
    );
    const nonOne = createListPlan(
      "8. Alpha\n9. Beta\n10. Gamma\n11. Delta",
      [40, 40, 40, 40],
      80,
      0,
    );

    expect(repeated.pages[1].fragments[0].source).toMatch(/^3\. Gamma/);
    expect(nonOne.pages[1].fragments[0].source).toMatch(/^10\. Gamma/);
    expect(repeated.pages[1].fragments[0].sourceRepresentation).toBe(
      "reconstructed",
    );
  });

  it("keeps nested content attached to its top-level item", () => {
    const markdown = "- Alpha\n  - A1\n  - A2\n\n- Beta";
    const { pages, listUnit } = createListPlan(markdown, [80, 40], 80, 0);
    const fragments = pages.flatMap((page) => page.fragments);

    expect(listUnit.listMetadata?.items[0].to).toBeLessThan(
      listUnit.listMetadata?.items[1].from ?? 0,
    );
    expect(fragments[0].source).toContain("A1");
    expect(fragments[0].source).toContain("A2");
    expect(fragments[1].source).toBe("- Beta");
  });

  it("preserves task-list markers and loose-list structure in reconstructed fragments", () => {
    const markdown = "- [x] Done\n\n- [ ] Pending\n\n- [ ] Later";
    const { pages } = createListPlan(markdown, [30, 30, 30], 60, 0);
    const fragments = pages.flatMap((page) => page.fragments);

    expect(fragments[0].source).toBe("- [x] Done\n\n- [ ] Pending");
    expect(fragments[1].source).toBe("- [ ] Later");
    expect(fragments[0].source).toContain("[x]");
    expect(fragments[1].source).toContain("[ ]");
    expect(parseMarkdownDocument(fragments[0].source).blocks[0].node).toMatchObject({
      type: "list",
      spread: true,
      children: [{ checked: true }, { checked: false }],
    });
  });

  it("moves a list to a fresh page when its first item cannot fit remaining space", () => {
    const markdown = "---\n\n- Alpha\n- Beta";
    const { pages } = createListPlan(markdown, [60, 40], 100, 14);

    expect(pages[0].fragments.map((fragment) => fragment.kind)).toEqual([
      "thematicBreak",
    ]);
    expect(pages[1].fragments.map((fragment) => fragment.source)).toEqual([
      "- Alpha\n- Beta",
    ]);
  });

  it("keeps a heading with the first list item when the full list does not fit", () => {
    const { pages } = createListPlan(
      "---\n\n# Heading\n\n- One\n- Two",
      [40, 40],
      160,
      14,
    );

    expect(pages[0].fragments.map((fragment) => fragment.kind)).toEqual([
      "thematicBreak",
    ]);
    expect(pages[1].fragments.map((fragment) => fragment.kind)).toEqual([
      "heading",
      "list",
    ]);
    expect(pages[1].fragments[1].source).toBe("- One");
  });

  it("renders an oversized top-level item and continues afterward", () => {
    const { pages } = createListPlan(
      "- Huge\n  - Nested\n- Small",
      [150, 20],
      100,
      0,
    );

    expect(pages).toHaveLength(2);
    expect(pages[0].isOversized).toBe(true);
    expect(pages[0].fragments[0].source).toContain("Nested");
    expect(pages[1].fragments[0].source).toBe("- Small");
  });
});
