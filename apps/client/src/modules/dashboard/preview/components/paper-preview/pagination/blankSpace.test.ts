import { describe, expect, it } from "vitest";

import { parseMarkdownDocument } from "@/modules/dashboard/document";

import { analyzeWhitespaceGap } from "./blankSpace";
import { createDocumentLayoutUnits } from "./documentLayout";

describe("intentional blank-space layout", () => {
  it("does not create a unit for normal Markdown separation", () => {
    const markdown = "Paragraph A\n\nParagraph B";
    const units = createDocumentLayoutUnits(
      parseMarkdownDocument(markdown).blocks,
      markdown,
    );

    expect(units.some((unit) => unit.kind === "blankSpace")).toBe(false);
  });

  it("creates extra lines from a top-level source gap", () => {
    const markdown = "Paragraph A\n\n\n\n\nParagraph B";
    const blocks = parseMarkdownDocument(markdown).blocks;
    const units = createDocumentLayoutUnits(blocks, markdown);
    const spacer = units.find((unit) => unit.kind === "blankSpace");

    expect(spacer?.blankSpaceMetadata).toMatchObject({
      boundary: "between",
      lineCount: 3,
      sourceRange: { from: 13, to: 16 },
    });
    expect(spacer?.source).toBe("\n\n\n");
  });

  it("counts whitespace-only lines containing spaces, tabs, and CRLF", () => {
    expect(analyzeWhitespaceGap("\n\n  \n\t\n", 10, "between")).toMatchObject({
      lineCount: 2,
      sourceRange: { from: 12, to: 17 },
    });
    expect(analyzeWhitespaceGap("\r\n\r\n\r\n", 4, "between")).toMatchObject({
      lineCount: 1,
      sourceRange: { from: 8, to: 10 },
    });
  });

  it("uses one incidental newline as the leading/trailing baseline", () => {
    expect(analyzeWhitespaceGap("\n", 0, "leading")).toBeNull();
    expect(analyzeWhitespaceGap("\n\n", 0, "leading")?.lineCount).toBe(1);
    expect(analyzeWhitespaceGap("\n", 0, "trailing")).toBeNull();
    expect(analyzeWhitespaceGap("\n\n\n", 0, "trailing")?.lineCount).toBe(2);
  });

  it("does not create whitespace units inside semantic blocks or across definitions", () => {
    const codeMarkdown = "```ts\nconst first = 1;\n\nconst third = 3;\n```";
    const codeUnits = createDocumentLayoutUnits(
      parseMarkdownDocument(codeMarkdown).blocks,
      codeMarkdown,
    );
    const definitionMarkdown =
      "Paragraph A\n\n[google]: https://google.com\n\n\nParagraph B";
    const definitionUnits = createDocumentLayoutUnits(
      parseMarkdownDocument(definitionMarkdown).blocks,
      definitionMarkdown,
    );

    expect(codeUnits.filter((unit) => unit.kind === "blankSpace")).toHaveLength(0);
    expect(
      definitionUnits.filter((unit) => unit.kind === "blankSpace"),
    ).toHaveLength(0);
  });
});
