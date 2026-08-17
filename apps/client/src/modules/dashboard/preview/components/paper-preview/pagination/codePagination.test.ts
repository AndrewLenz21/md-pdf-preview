import { describe, expect, it } from "vitest";

import { parseMarkdownDocument } from "@/modules/dashboard/document";
import { createCodeMeasurementProfile } from "@/modules/dashboard/preview/measurement/codeMeasurement";

import { createDocumentLayoutUnits } from "./documentLayout";
import { paginateDocument } from "./paginateDocument";

function createCodeProfile(
  unit: ReturnType<typeof createDocumentLayoutUnits>[number],
  lineHeights: number[],
  gapsAfter = lineHeights.map(() => 0),
) {
  const metadata = unit.codeMetadata;

  if (!metadata) {
    throw new Error("Expected code metadata");
  }

  const fullHeight = lineHeights.reduce(
    (total, height, index) =>
      total + height + (index < lineHeights.length - 1 ? gapsAfter[index] : 0),
    0,
  );

  const profile = createCodeMeasurementProfile({
    unitId: unit.id,
    parentBlockId: unit.parentBlock.id,
    metadata,
    fullHeight,
    lines: metadata.lines.map((sourceRange, index) => ({
      index,
      sourceRange,
      height: lineHeights[index],
      gapAfter: gapsAfter[index] ?? 0,
    })),
  });

  if (!profile) {
    throw new Error("Expected a valid code profile");
  }

  return profile;
}

function createCodePlan(
  lines: string[],
  lineHeights: number[],
  pageContentHeight: number,
  options?: {
    opening?: string;
    closing?: string;
    blockGap?: number;
    gapsAfter?: number[];
  },
) {
  const opening = options?.opening ?? "```ts";
  const closing = options?.closing ?? "```";
  const markdown = [opening, ...lines, closing].join("\n");
  const parsed = parseMarkdownDocument(markdown);
  const units = createDocumentLayoutUnits(parsed.blocks);
  const codeUnit = units.find((unit) => unit.splittingStrategy === "code");

  if (!codeUnit) {
    throw new Error("Expected a splittable code unit");
  }

  const profile = createCodeProfile(
    codeUnit,
    lineHeights,
    options?.gapsAfter,
  );
  const pages = paginateDocument(
    units,
    units.map((unit) => ({
      id: unit.id,
      height: unit.id === codeUnit.id ? profile.fullHeight : 80,
    })),
    pageContentHeight,
    options?.blockGap ?? 14,
    [],
    [],
    [profile],
  );

  return { markdown, units, codeUnit, profile, pages };
}

describe("semantic code pagination", () => {
  it("keeps a short code block complete and direct", () => {
    const { pages, markdown } = createCodePlan(["const value = 1;"], [32], 100);

    expect(pages).toHaveLength(1);
    expect(pages[0].fragments).toHaveLength(1);
    expect(pages[0].fragments[0].source).toBe(markdown);
    expect(pages[0].fragments[0].sourceRepresentation).toBe("direct");
    expect(pages[0].fragments[0].continuation).toBe("none");
  });

  it("fits the largest measured logical-line range", () => {
    const { pages } = createCodePlan(
      ["one", "two", "three", "four"],
      [65, 48, 59, 69],
      190,
      { blockGap: 0 },
    );
    const fragments = pages.flatMap((page) => page.fragments);

    expect(fragments).toHaveLength(2);
    expect(fragments[0].source).toContain("one\ntwo\nthree");
    expect(fragments[0].source).not.toContain("four");
    expect(fragments[1].source).toContain("four");
    expect(fragments.map((fragment) => fragment.continuation)).toEqual([
      "start",
      "end",
    ]);
  });

  it("splits a giant code block across normal pages", () => {
    const { pages } = createCodePlan(
      Array.from({ length: 10 }, (_, index) => `line ${index + 1}`),
      Array.from({ length: 10 }, () => 60),
      300,
      { blockGap: 0 },
    );

    expect(pages).toHaveLength(2);
    expect(pages.every((page) => !page.isOversized)).toBe(true);
    expect(pages.flatMap((page) => page.fragments)).toHaveLength(2);
  });

  it("uses remaining current-page space before continuing code", () => {
    const markdown = [
      "---",
      "",
      "```ts",
      "one",
      "two",
      "three",
      "four",
      "```",
    ].join("\n");
    const parsed = parseMarkdownDocument(markdown);
    const units = createDocumentLayoutUnits(parsed.blocks);
    const codeUnit = units.find((unit) => unit.splittingStrategy === "code")!;
    const profile = createCodeProfile(codeUnit, [50, 40, 40, 40]);
    const pages = paginateDocument(
      units,
      units.map((unit) => ({
        id: unit.id,
        height: unit.id === codeUnit.id ? profile.fullHeight : 140,
      })),
      300,
      14,
      [],
      [],
      [profile],
    );

    expect(pages[0].fragments[1].source).toContain("one\ntwo\nthree");
    expect(pages[0].fragments[1].source).not.toContain("four");
    expect(pages[1].fragments[0].source).toContain("four");
    expect(pages.every((page) => !page.isOversized)).toBe(true);
  });

  it("accepts an exact-height logical-line boundary", () => {
    const { pages } = createCodePlan(
      ["one", "two", "three"],
      [65, 48, 59],
      113,
      { blockGap: 0 },
    );

    expect(pages[0].fragments[0].source).toContain("one\ntwo");
    expect(pages[0].fragments[0].source).not.toContain("three");
  });

  it("respects a wrapped logical line as one indivisible source line", () => {
    const longLine = "const extremelyLongVariableName = someVeryLongFunctionCall(...);";
    const { pages } = createCodePlan(
      ["short", longLine, "after"],
      [32, 96, 32],
      128,
      { blockGap: 0 },
    );

    expect(pages[0].fragments[0].source).toContain(longLine);
    expect(pages[0].fragments[0].source).not.toContain("after");
    expect(pages[1].fragments[0].source).toContain("after");
  });

  it("preserves blank lines and exhaustive content source ownership", () => {
    const { pages, codeUnit } = createCodePlan(
      ["first", "", "third", "fourth"],
      [32, 32, 32, 32],
      64,
      { blockGap: 0 },
    );
    const fragments = pages.flatMap((page) => page.fragments);
    const metadata = codeUnit.codeMetadata!;
    const ownedSource = fragments
      .map((fragment) =>
        codeUnit.parentBlock.source.slice(
          fragment.sourceRange.from,
          fragment.sourceRange.to,
        ),
      )
      .join("");

    expect(ownedSource).toBe(
      codeUnit.parentBlock.source.slice(
        metadata.contentRange.from,
        metadata.contentRange.to,
      ),
    );
    expect(fragments.map((fragment) => fragment.continuation)).toEqual([
      "start",
      "end",
    ]);
  });

  it("assigns start, middle, and end continuation metadata", () => {
    const { pages } = createCodePlan(
      ["one", "two", "three", "four", "five"],
      [40, 40, 40, 40, 40],
      80,
      { blockGap: 0 },
    );

    expect(pages).toHaveLength(3);
    expect(pages.flatMap((page) => page.fragments).map((fragment) => fragment.continuation)).toEqual([
      "start",
      "middle",
      "end",
    ]);
  });

  it("does not add a document gap before a continuation page", () => {
    const { pages } = createCodePlan(
      ["one", "two", "three"],
      [40, 40, 40],
      80,
      { blockGap: 14 },
    );

    expect(pages.map((page) => page.contentHeight)).toEqual([80, 40]);
  });

  it("preserves language info, tilde fences, and long fence safety", () => {
    const tildePlan = createCodePlan(
      ["first", "second", "third"],
      [32, 32, 32],
      64,
      { opening: "~~~~python", closing: "~~~~", blockGap: 0 },
    );
    const longFencePlan = createCodePlan(
      ["const nested = ` ``` `;", "next"],
      [32, 32],
      32,
      { opening: "````typescript", closing: "````", blockGap: 0 },
    );

    expect(tildePlan.pages[0].fragments[0].source).toMatch(/^~~~~python\n/);
    expect(tildePlan.pages[1].fragments[0].source).toMatch(/~~~~$/);
    expect(longFencePlan.pages[0].fragments[0].source).toMatch(/^````typescript\n/);
    expect(longFencePlan.pages[0].fragments[0].source).toContain("``` ");
  });

  it("moves code to a fresh page when the first line cannot fit", () => {
    const markdown = ["---", "", "```ts", "first", "second", "```"].join("\n");
    const parsed = parseMarkdownDocument(markdown);
    const units = createDocumentLayoutUnits(parsed.blocks);
    const codeUnit = units.find((unit) => unit.splittingStrategy === "code")!;
    const profile = createCodeProfile(codeUnit, [40, 40]);
    const pages = paginateDocument(
      units,
      units.map((unit) => ({
        id: unit.id,
        height: unit.id === codeUnit.id ? profile.fullHeight : 80,
      })),
      100,
      14,
      [],
      [],
      [profile],
    );

    expect(pages[0].fragments.map((fragment) => fragment.kind)).toEqual([
      "thematicBreak",
    ]);
    expect(pages[1].fragments[0].kind).toBe("code");
  });

  it("keeps a heading with the first code-line fragment", () => {
    const markdown = [
      "---",
      "",
      "# Heading",
      "",
      "```ts",
      "first",
      "second",
      "```",
    ].join("\n");
    const parsed = parseMarkdownDocument(markdown);
    const units = createDocumentLayoutUnits(parsed.blocks);
    const codeUnit = units.find((unit) => unit.splittingStrategy === "code")!;
    const profile = createCodeProfile(codeUnit, [40, 40]);
    const pages = paginateDocument(
      units,
      units.map((unit) => ({
        id: unit.id,
        height: unit.id === codeUnit.id ? profile.fullHeight : 80,
      })),
      160,
      14,
      [],
      [],
      [profile],
    );

    expect(pages[1].fragments.map((fragment) => fragment.kind)).toEqual([
      "heading",
      "code",
    ]);
    expect(pages[1].fragments[1].source).toContain("first");
  });

  it("renders an oversized logical line and continues afterward", () => {
    const { pages } = createCodePlan(
      ["very long line", "following"],
      [150, 20],
      100,
      { blockGap: 0 },
    );

    expect(pages).toHaveLength(2);
    expect(pages[0].isOversized).toBe(true);
    expect(pages[0].fragments[0].source).toContain("very long line");
    expect(pages[1].fragments[0].source).toContain("following");
  });

  it("keeps an empty fenced block atomic and terminating", () => {
    const { pages, codeUnit } = createCodePlan([], [], 100, { blockGap: 0 });

    expect(codeUnit.codeMetadata?.lines).toHaveLength(0);
    expect(pages).toHaveLength(1);
    expect(pages[0].fragments[0].continuation).toBe("none");
  });
});
