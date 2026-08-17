import { describe, expect, it } from "vitest";

import { parseMarkdownDocument } from "@/modules/dashboard/document";
import { createDocumentLayoutUnits } from "../components/paper-preview/pagination/documentLayout";

import {
  createCodeMeasurementProfile,
  findLargestFittingCodeFragment,
  getCodeFragmentHeight,
} from "./codeMeasurement";

function createProfile(lineHeights: number[], gapsAfter = lineHeights.map(() => 0)) {
  const markdown = [
    "```ts",
    ...lineHeights.map((_, index) => `line ${index}`),
    "```",
  ].join("\n");
  const [block] = parseMarkdownDocument(markdown).blocks;
  const [unit] = createDocumentLayoutUnits([block]);
  const metadata = unit.codeMetadata!;
  const fullHeight = lineHeights.reduce(
    (total, height, index) =>
      total + height + (index < lineHeights.length - 1 ? gapsAfter[index] : 0),
    0,
  );

  return createCodeMeasurementProfile({
    unitId: unit.id,
    parentBlockId: block.id,
    metadata,
    fullHeight,
    lines: metadata.lines.map((sourceRange, index) => ({
      index,
      sourceRange,
      height: lineHeights[index],
      gapAfter: gapsAfter[index] ?? 0,
    })),
  });
}

describe("code measurement profiles", () => {
  it("fits the largest contiguous logical-line range", () => {
    const profile = createProfile([65, 48, 59, 69]);

    expect(profile).not.toBeNull();

    if (!profile) {
      return;
    }

    expect(findLargestFittingCodeFragment(profile, 0, 190)).toMatchObject({
      fromLine: 0,
      toLine: 3,
      height: 172,
      isOversized: false,
    });
    expect(findLargestFittingCodeFragment(profile, 0, 172)).toMatchObject({
      toLine: 3,
      height: 172,
    });
  });

  it("respects wrapped-line geometry instead of source line count", () => {
    const profile = createProfile([32, 96, 32]);

    expect(profile).not.toBeNull();

    if (!profile) {
      return;
    }

    expect(findLargestFittingCodeFragment(profile, 0, 128)).toMatchObject({
      toLine: 2,
      height: 128,
    });
    expect(findLargestFittingCodeFragment(profile, 1, 95)).toMatchObject({
      toLine: 2,
      isOversized: true,
    });
  });

  it("keeps blank logical lines in source coverage", () => {
    const markdown = ["```ts", "first", "", "third", "```"].join("\n");
    const [block] = parseMarkdownDocument(markdown).blocks;
    const [unit] = createDocumentLayoutUnits([block]);
    const metadata = unit.codeMetadata!;
    const profile = createCodeMeasurementProfile({
      unitId: unit.id,
      parentBlockId: block.id,
      metadata,
      fullHeight: 30,
      lines: metadata.lines.map((sourceRange, index) => ({
        index,
        sourceRange,
        height: 10,
        gapAfter: 0,
      })),
    });

    expect(metadata.lines).toHaveLength(3);
    expect(profile).not.toBeNull();
    expect(
      metadata.lines.map((line) => block.source.slice(line.from, line.to)).join(""),
    ).toBe("first\n\nthird\n");
  });

  it("handles an empty code profile without creating a fitting loop", () => {
    const [block] = parseMarkdownDocument("```txt\n```").blocks;
    const [unit] = createDocumentLayoutUnits([block]);
    const profile = createCodeMeasurementProfile({
      unitId: unit.id,
      parentBlockId: block.id,
      metadata: unit.codeMetadata!,
      fullHeight: 24,
      lines: [],
    });

    expect(profile).not.toBeNull();
    expect(profile && getCodeFragmentHeight(profile, 0, 0)).toBe(24);
    expect(profile && findLargestFittingCodeFragment(profile, 0, 24)).toBeNull();
  });

  it("rejects overlapping or mismatched source ranges", () => {
    const profile = createProfile([20, 20]);

    expect(profile).not.toBeNull();

    if (!profile) {
      return;
    }

    expect(
      createCodeMeasurementProfile({
        unitId: profile.unitId,
        parentBlockId: profile.parentBlockId,
        metadata: {
          openingIndent: "",
          openingFence: "```",
          info: "ts",
          openingLineEnding: "\n",
          closingIndent: "",
           closingFence: "```",
           closingSuffix: "",
           content: "line 0\nline 1",
           renderedContent: "line 0\nline 1\n",
           contentRange: { from: 6, to: 21 },
          lines: [
            { index: 0, from: 6, to: 14 },
            { index: 1, from: 13, to: 21 },
          ],
        },
        fullHeight: 40,
        lines: [
          {
            index: 0,
            sourceRange: { from: 6, to: 14 },
            height: 20,
            gapAfter: 0,
          },
          {
            index: 1,
            sourceRange: { from: 13, to: 21 },
            height: 20,
            gapAfter: 0,
          },
        ],
      }),
    ).toBeNull();
  });
});
