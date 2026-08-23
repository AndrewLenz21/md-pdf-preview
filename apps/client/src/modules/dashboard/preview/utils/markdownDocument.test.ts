import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { createDocumentLayoutUnits } from "../components/paper-preview/pagination/documentLayout";
import {
  parseMarkdownDocument,
  replaceBlockSource,
} from "@/modules/dashboard/document";
import {
  createParagraphMeasurementProfile,
  getParagraphMeasurementCandidates,
} from "@/modules/dashboard/preview/measurement/paragraphMeasurement";
import { createListMeasurementProfile } from "@/modules/dashboard/preview/measurement/listMeasurement";
import { paginateDocument } from "../components/paper-preview/pagination/paginateDocument";

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

    return [
      createParagraphMeasurementProfile({
        unitId: unit.id,
        parentBlockId: unit.parentBlock.id,
        sourceLength: unit.source.length,
        candidates,
        heights: new Map(
          candidates.map((candidate, index) => [
            candidate.id,
            (fullHeight * (index + 1)) / candidates.length,
          ]),
        ),
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

function flattenPageFragments(
  pages: ReturnType<typeof paginateDocument>,
) {
  return pages.flatMap((page) => page.fragments);
}

describe("Markdown document model", () => {
  it("keeps a block ID stable when only its source changes", () => {
    const before = parseMarkdownDocument("Original paragraph").blocks[0];
    const after = parseMarkdownDocument("A much longer paragraph").blocks[0];

    expect(after.id).toBe(before.id);
  });

  it("Test A: keeps every word from a long paragraph that crosses page boundaries", () => {
    const markdown = Array.from(
      { length: 900 },
      (_, index) => `word-${index}`,
    ).join(" ");
    const parsed = parseMarkdownDocument(markdown);
    const units = createDocumentLayoutUnits(parsed.blocks);
    const pages = paginateWithProfiles(units, measureUnits(units, 240), 480);

    expect(units).toHaveLength(1);
    expect(units.map((unit) => unit.source).join("")).toBe(markdown);
    expect(flattenPageFragments(pages).map((fragment) => fragment.source).join(""))
      .toBe(markdown);
  });

  it("accounts for the inter-block gap when deciding whether a heading can stay with its paragraph", () => {
    const units = createDocumentLayoutUnits(
      parseMarkdownDocument("# Heading\n\nParagraph").blocks,
    );
    const pages = paginateWithProfiles(
      units,
      [
        { id: units[0].id, height: 200 },
        { id: units[1].id, height: 190 },
      ],
      400,
      14,
    );

    expect(pages).toHaveLength(2);
    expect(pages[0].fragments.map((fragment) => fragment.parentBlockId)).toEqual([
      units[0].parentBlock.id,
    ]);
    expect(pages[1].fragments.map((fragment) => fragment.parentBlockId)).toEqual([
      units[1].parentBlock.id,
    ]);
  });

  it("Test C: lets a large unordered list continue without dropping items", () => {
    const markdown = Array.from({ length: 14 }, (_, index) => `- item ${index + 1}`).join("\n");
    const units = createDocumentLayoutUnits(parseMarkdownDocument(markdown).blocks);
    const pages = paginateWithProfiles(units, measureUnits(units, 130), 390);

    expect(units).toHaveLength(1);
    expect(units[0].splittingStrategy).toBe("list");
    expect(pages.length).toBeGreaterThan(1);
    expect(flattenPageFragments(pages).map((fragment) => fragment.source).join("\n")).toBe(
      markdown,
    );
  });

  it("Test D: preserves ordered-list markers across page units", () => {
    const markdown = Array.from({ length: 12 }, (_, index) => `${index + 1}. item ${index + 1}`).join("\n");
    const units = createDocumentLayoutUnits(parseMarkdownDocument(markdown).blocks);
    const pages = paginateWithProfiles(units, measureUnits(units, 150), 300);

    expect(pages.length).toBeGreaterThan(1);
    expect(units[0].source).toMatch(/^1\. /);
    expect(flattenPageFragments(pages).at(-1)?.source).toMatch(/12\. /);
  });

  it("keeps loose-list paragraph spacing when items are rendered together", () => {
    const markdown = "- first\n\n- second";
    const units = createDocumentLayoutUnits(parseMarkdownDocument(markdown).blocks);

    expect(units).toHaveLength(1);
    expect(units[0].source).toBe(markdown);
  });

  it("Test E: repeats table headers in row-sized table units without losing rows", () => {
    const markdown = [
      "| Name | Value |",
      "| --- | --- |",
      ...Array.from({ length: 10 }, (_, index) => `| Row ${index + 1} | ${index + 1} |`),
    ].join("\n");
    const units = createDocumentLayoutUnits(parseMarkdownDocument(markdown).blocks);

    expect(units).toHaveLength(10);
    expect(units.every((unit) => unit.kind === "tableRow")).toBe(true);
    expect(units.every((unit) => unit.source.startsWith("| Name | Value |\n| --- | --- |"))).toBe(true);
    expect(units.map((unit) => unit.tableRow).join("\n")).toContain("| Row 10 | 10 |");
  });

  it("splits a long aside while preserving its semantic wrapper", () => {
    const markdown = [
      "<aside>",
      "🧾",
      "",
      "First section of the callout. Second section continues on the next page.",
      "",
      "</aside>",
    ].join("\n");
    const [unit] = createDocumentLayoutUnits(
      parseMarkdownDocument(markdown).blocks,
    );
    const calloutContent = unit.calloutContent ?? "";
    const splitOffset = calloutContent.indexOf("Second");
    const pages = paginateDocument(
      [unit],
      [{ id: unit.id, height: 240 }],
      150,
      0,
      [
        {
          unitId: unit.id,
          parentBlockId: unit.parentBlock.id,
          sourceLength: calloutContent.length,
          fullHeight: 240,
          fitPoints: [
            { sourceOffset: 0, height: 0, isLineBoundary: true },
            { sourceOffset: splitOffset, height: 120, isLineBoundary: true },
            { sourceOffset: calloutContent.length, height: 240, isLineBoundary: true },
          ],
        },
      ],
    );

    expect(pages).toHaveLength(2);
    expect(pages[0].fragments[0]?.kind).toBe("callout");
    expect(pages[1].fragments[0]?.kind).toBe("callout");
    expect(pages[0].fragments[0]?.source).toContain("<aside>");
    expect(pages[1].fragments[0]?.source).toContain("</aside>");
    expect(pages[0].fragments[0]?.calloutContent).toContain("First");
    expect(pages[1].fragments[0]?.calloutContent).toContain("Second");
  });

  it("Test F: fragments long code without losing lines", () => {
    const markdown = [
      "```ts",
      ...Array.from({ length: 35 }, (_, index) => `const line${index} = ${index};`),
      "```",
    ].join("\n");
    const units = createDocumentLayoutUnits(parseMarkdownDocument(markdown).blocks);

    expect(units).toHaveLength(1);
    expect(units[0].splittingStrategy).toBe("code");
    expect(units[0].codeMetadata?.lines).toHaveLength(35);
    expect(units[0].source).toContain("const line34 = 34;");
  });

  it("Test G: parses raw aside Markdown as a semantic info callout", () => {
    const markdown = "<aside>\n🎯 **Core idea:** This should render as a real callout.\n</aside>";
    const [block] = parseMarkdownDocument(markdown).blocks;

    expect(block.kind).toBe("callout");
    expect(block.callout?.variant).toBe("info");
    expect(block.callout?.icon).toBe("🎯");
    expect(block.callout?.innerMarkdown).not.toContain("🎯");
    expect(block.callout?.innerMarkdown).toContain("**Core idea:**");
  });

  it("normalizes a standalone aside icon without consuming following code or dividers", () => {
    const markdown = [
      "<aside>",
      "🎯",
      "",
      "**Core idea:** a simple, useful open-source companion for Notion that lets users paste Notion content and preview exactly how it will paginate before exporting or printing it as PDF.",
      "",
      "</aside>",
      "",
      "```jsx",
      "cd 'C:\\Andrew\\Projects\\Portfolio Projects\\2026-08\\md-pdf-preview'",
      "```",
      "",
      "---",
    ].join("\n");
    const parsed = parseMarkdownDocument(markdown);
    const [callout, code, divider] = parsed.blocks;

    expect(parsed.blocks.map((block) => block.kind)).toEqual([
      "callout",
      "code",
      "thematicBreak",
    ]);
    expect(callout.callout?.icon).toBe("🎯");
    expect(callout.callout?.innerMarkdown).toBe(
      "**Core idea:** a simple, useful open-source companion for Notion that lets users paste Notion content and preview exactly how it will paginate before exporting or printing it as PDF.",
    );
    expect(code.node.type).toBe("code");
    expect(code.node.type === "code" ? code.node.lang : undefined).toBe("jsx");
    expect(code.source).toContain("cd 'C:\\Andrew\\Projects");
    expect(divider.node.type).toBe("thematicBreak");
  });

  it("keeps additional aside paragraphs intact after extracting the icon", () => {
    const markdown = [
      "<aside>",
      "💡",
      "",
      "First paragraph.",
      "",
      "Second paragraph with additional information.",
      "</aside>",
    ].join("\n");
    const [block] = parseMarkdownDocument(markdown).blocks;

    expect(block.callout?.icon).toBe("💡");
    expect(block.callout?.innerMarkdown).toBe(
      "First paragraph.\n\nSecond paragraph with additional information.",
    );
  });

  it("Test H: retains independent consecutive callouts and their variants", () => {
    const markdown = [
      '<aside data-variant="success">\nSuccess\n</aside>',
      "",
      '<aside class="callout danger">\nDanger\n</aside>',
    ].join("\n");
    const blocks = parseMarkdownDocument(markdown).blocks;

    expect(blocks).toHaveLength(2);
    expect(blocks.map((block) => block.callout?.variant)).toEqual([
      "success",
      "danger",
    ]);
  });

  it("keeps empty and multi-paragraph callouts as single semantic blocks", () => {
    const markdown = [
      "<aside>",
      "",
      "</aside>",
      "",
      '<aside data-variant="warning">',
      "First paragraph.",
      "",
      "Second paragraph.",
      "</aside>",
    ].join("\n");
    const blocks = parseMarkdownDocument(markdown).blocks;

    expect(blocks).toHaveLength(2);
    expect(blocks[0].kind).toBe("callout");
    expect(blocks[0].callout?.innerMarkdown).toBe("");
    expect(blocks[1].callout?.innerMarkdown).toContain("Second paragraph.");
  });

  it("Test I: visual-block commits update the one canonical Markdown string", () => {
    const markdown = "Initial paragraph.";
    const [block] = parseMarkdownDocument(markdown).blocks;
    const updated = replaceBlockSource(markdown, block, "Updated paragraph.");

    expect(updated).toBe("Updated paragraph.");
  });

  it("Test J and K: source updates remain visible after repeated parse cycles", () => {
    let markdown = "# Original\n\nContent";

    for (const title of ["First", "Second", "Final"]) {
      const [heading] = parseMarkdownDocument(markdown).blocks;
      markdown = replaceBlockSource(markdown, heading, `# ${title}`);
    }

    const reparsed = parseMarkdownDocument(markdown);

    expect(reparsed.blocks[0].source).toBe("# Final");
    expect(reparsed.blocks[1].source).toBe("Content");
  });

  it("preserves unsupported HTML as an explicit non-editable block", () => {
    const [block] = parseMarkdownDocument("<script>alert('no')</script>").blocks;

    expect(block.kind).toBe("unsupported");
    expect(block.editable).toBe(false);
  });

  it("keeps inline raw HTML atomic instead of serializing it through visual editing", () => {
    const [block] = parseMarkdownDocument("Text before <mark>raw HTML</mark>.").blocks;

    expect(block.kind).toBe("unsupported");
    expect(block.editable).toBe(false);
  });

  it("Test L: includes A4 print rules and hides workspace controls", async () => {
    const css = await readFile(
      new URL("../../../../app/styles/print.css", import.meta.url),
      "utf8",
    );

    expect(css).toContain("@page");
    expect(css).toContain("size: A4");
    expect(css).toContain(".document-preview-root");
    expect(css).toContain(".document-measure-surface");
    expect(css).toContain(".print-document-preview");
    expect(css).toContain("-webkit-print-color-adjust: exact");
    expect(css).toContain("print-color-adjust: exact");
    expect(css).toContain(".dashboard-workspace > :not(.print-document-preview)");
    expect(css).toContain(".print-document-preview .document-preview-stage");
    expect(css).toContain(".print-document-preview .document-page-frame:last-child");
  });
});
