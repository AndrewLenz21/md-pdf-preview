import { describe, expect, it } from "vitest";

import { parseMarkdownDocument } from "@/modules/dashboard/document";

import {
  createDocumentLayoutUnits,
  getCodeFragmentSource,
  getCodeLayoutMetadata,
} from "./documentLayout";

describe("code layout metadata", () => {
  it("owns logical content lines without assigning fence lines", () => {
    const markdown = [
      "```typescript",
      "const first = 1;",
      "",
      "const third = 3;",
      "```",
    ].join("\n");
    const [block] = parseMarkdownDocument(markdown).blocks;
    const [unit] = createDocumentLayoutUnits([block]);
    const metadata = getCodeLayoutMetadata(block);

    expect(unit.splittingStrategy).toBe("code");
    expect(metadata?.openingFence).toBe("```");
    expect(metadata?.info).toBe("typescript");
    expect(metadata?.content).toBe("const first = 1;\n\nconst third = 3;");
    expect(metadata?.renderedContent).toBe(
      "const first = 1;\n\nconst third = 3;\n",
    );
    expect(metadata?.lines).toHaveLength(3);
    expect(metadata?.lines[0].from).toBe(metadata?.contentRange.from);
    expect(
      metadata?.lines
        .map((line) => block.source.slice(line.from, line.to))
        .join(""),
    ).toBe("const first = 1;\n\nconst third = 3;\n");
    expect(metadata?.contentRange.to).toBe(
      metadata?.lines.at(-1)?.to,
    );
  });

  it("preserves long backtick fences, info strings, and tilde fences", () => {
    const backtickMarkdown = [
      "````typescript",
      "const value = `nested`;",
      "````",
    ].join("\n");
    const tildeMarkdown = ["~~~~python", "print('hello')", "~~~~"].join("\n");
    const [backtickBlock] = parseMarkdownDocument(backtickMarkdown).blocks;
    const [tildeBlock] = parseMarkdownDocument(tildeMarkdown).blocks;
    const [backtickUnit] = createDocumentLayoutUnits([backtickBlock]);
    const [tildeUnit] = createDocumentLayoutUnits([tildeBlock]);

    expect(backtickUnit.codeMetadata?.openingFence).toBe("````");
    expect(backtickUnit.codeMetadata?.closingFence).toBe("````");
    expect(getCodeFragmentSource(backtickUnit, 0, 1)).toBe(backtickMarkdown);
    expect(tildeUnit.codeMetadata?.openingFence).toBe("~~~~");
    expect(tildeUnit.codeMetadata?.closingFence).toBe("~~~~");
    expect(getCodeFragmentSource(tildeUnit, 0, 1)).toBe(tildeMarkdown);
  });

  it("preserves CRLF content ownership", () => {
    const markdown = "```ts\r\nline one\r\nline two\r\n```";
    const [block] = parseMarkdownDocument(markdown).blocks;
    const metadata = getCodeLayoutMetadata(block);

    expect(metadata?.lines.map((line) => block.source.slice(line.from, line.to)).join(""))
      .toBe("line one\r\nline two\r\n");
  });

  it("keeps empty and unsupported fenced forms safe", () => {
    const [emptyBlock] = parseMarkdownDocument("```\n```").blocks;
    const [unclosedBlock] = parseMarkdownDocument("```ts\nconst value = 1;").blocks;
    const [indentedBlock] = parseMarkdownDocument("    const value = 1;").blocks;
    const [emptyUnit] = createDocumentLayoutUnits([emptyBlock]);
    const [unclosedUnit] = createDocumentLayoutUnits([unclosedBlock]);
    const [indentedUnit] = createDocumentLayoutUnits([indentedBlock]);

    expect(emptyUnit.splittingStrategy).toBe("code");
    expect(emptyUnit.codeMetadata?.lines).toHaveLength(0);
    expect(unclosedUnit.splittingStrategy).toBe("atomic");
    expect(unclosedUnit.codeMetadata).toBeUndefined();
    expect(indentedUnit.splittingStrategy).toBe("atomic");
  });
});
