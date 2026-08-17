import { describe, expect, it } from "vitest";

import { parseMarkdownDocument } from "@/modules/dashboard/document";
import {
  createParagraphMeasurementProfile,
  getParagraphMeasurementCandidates,
} from "@/modules/dashboard/preview/measurement/paragraphMeasurement";
import { createCodeMeasurementProfile } from "@/modules/dashboard/preview/measurement/codeMeasurement";

import { createDocumentLayoutUnits } from "./documentLayout";
import { createPageFragments } from "./pageFragments";
import { paginateDocument } from "./paginateDocument";

describe("PageFragment", () => {
  it("keeps plain paragraph fragments aligned with parent source ranges", () => {
    const markdown = Array.from(
      { length: 900 },
      (_, index) => `word-${index}`,
    ).join(" ");
    const [parentBlock] = parseMarkdownDocument(markdown).blocks;
    const units = createDocumentLayoutUnits([parentBlock]);
    const [unit] = units;
    const candidates = getParagraphMeasurementCandidates({
      id: unit.id,
      parentBlockId: parentBlock.id,
      source: unit.source,
      splittingStrategy: unit.splittingStrategy,
    });
    const profile = createParagraphMeasurementProfile({
      unitId: unit.id,
      parentBlockId: parentBlock.id,
      sourceLength: unit.source.length,
      candidates,
      heights: new Map(
        candidates.map((candidate, index) => [candidate.id, index + 1]),
      ),
    });
    const pages = paginateDocument(
      units,
      [{ id: unit.id, height: candidates.length }],
      240,
      0,
      profile ? [profile] : [],
    );
    const fragments = pages.flatMap((page) => page.fragments);

    expect(fragments.map((fragment) => fragment.source).join("")).toBe(
      parentBlock.source,
    );
    fragments.forEach((fragment) => {
      expect(fragment.sourceRepresentation).toBe("direct");
      expect(fragment.source).toBe(
        parentBlock.source.slice(
          fragment.sourceRange.from,
          fragment.sourceRange.to,
        ),
      );
    });
    expect(fragments[0].continuation).toBe("start");
    expect(fragments.at(-1)?.continuation).toBe("end");
  });

  it("marks table row fragments as reconstructed because headers repeat", () => {
    const markdown = [
      "| Name | Value |",
      "| --- | --- |",
      "| Row 1 | 1 |",
      "| Row 2 | 2 |",
    ].join("\n");
    const [parentBlock] = parseMarkdownDocument(markdown).blocks;
    const units = createDocumentLayoutUnits([parentBlock]);
    const [fragment] = createPageFragments([units[0]], units);

    expect(fragment.sourceRepresentation).toBe("reconstructed");
    expect(fragment.source).toContain("| Name | Value |");
    expect(
      parentBlock.source.slice(
        fragment.sourceRange.from,
        fragment.sourceRange.to,
      ),
    ).toBe("| Row 1 | 1 |");
    expect(fragment.source).not.toBe(
      parentBlock.source.slice(
        fragment.sourceRange.from,
        fragment.sourceRange.to,
      ),
    );
  });

  it("preserves ordered list item source slices", () => {
    const markdown = "1. First\n2. Second\n3. Third";
    const [parentBlock] = parseMarkdownDocument(markdown).blocks;
    const units = createDocumentLayoutUnits([parentBlock]);
    const fragments = units.map(
      (unit) => createPageFragments([unit], units)[0],
    );

    expect(fragments.map((fragment) => fragment.source).join("\n")).toBe(
      markdown,
    );
    fragments.forEach((fragment) => {
      expect(fragment.sourceRepresentation).toBe("direct");
      expect(fragment.source).toBe(
        parentBlock.source.slice(
          fragment.sourceRange.from,
          fragment.sourceRange.to,
        ),
      );
    });
  });

  it("keeps complete code direct and reconstructs split code fragments", () => {
    const markdown = [
      "```ts",
      ...Array.from({ length: 13 }, (_, index) => `const line${index} = ${index};`),
      "```",
    ].join("\n");
    const [parentBlock] = parseMarkdownDocument(markdown).blocks;
    const units = createDocumentLayoutUnits([parentBlock]);
    const [unit] = units;
    const [completeFragment] = createPageFragments([unit], units);

    expect(completeFragment.sourceRepresentation).toBe("direct");
    expect(completeFragment.source).toBe(parentBlock.source);

    const profile = createCodeMeasurementProfile({
      unitId: unit.id,
      parentBlockId: parentBlock.id,
      metadata: unit.codeMetadata!,
      fullHeight: 13 * 20,
      lines: unit.codeMetadata!.lines.map((sourceRange, index) => ({
        index,
        sourceRange,
        height: 20,
        gapAfter: 0,
      })),
    });
    const pages = paginateDocument(
      units,
      [{ id: unit.id, height: 13 * 20 }],
      100,
      0,
      [],
      [],
      profile ? [profile] : [],
    );
    const [fragment] = pages[0].fragments;

    expect(fragment.sourceRepresentation).toBe("reconstructed");
    expect(fragment.source).toMatch(/^```ts\n/);
    expect(fragment.source).toContain("const line0 = 0;");
    expect(parentBlock.source.slice(fragment.sourceRange.from, fragment.sourceRange.to)).toContain(
      "const line0 = 0;",
    );
    expect(fragment.source).not.toBe(
      parentBlock.source.slice(fragment.sourceRange.from, fragment.sourceRange.to),
    );
  });

  it("creates one explicit complete fragment when all units share a page", () => {
    const [parentBlock] = parseMarkdownDocument(
      Array.from({ length: 900 }, (_, index) => `word-${index}`).join(" "),
    ).blocks;
    const units = createDocumentLayoutUnits([parentBlock]);
    const [fragment] = createPageFragments(units, units);

    expect(fragment.source).toBe(parentBlock.source);
    expect(fragment.sourceRange).toEqual({
      from: 0,
      to: parentBlock.source.length,
    });
    expect(fragment.sourceRepresentation).toBe("direct");
    expect(fragment.continuation).toBe("none");
    expect(fragment.editable).toBe(parentBlock.editable);
  });
});
