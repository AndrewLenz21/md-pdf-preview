// @vitest-environment jsdom

import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { documentEditorExtensions } from "../extensions/documentEditorExtensions";
import { parseMarkdownDocument } from "@/modules/dashboard/document";
import { markdownToTiptapDocument } from "./documentToTiptap";
import { tiptapToMarkdown } from "./tiptapToMarkdown";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("Tiptap Markdown serialization", () => {
  it("keeps semantic blocks, marks, code, and callouts in human-readable Markdown", () => {
    const markdown = [
      "# Project Research",
      "",
      "This is **important** and *useful*.",
      "",
      "- First",
      "- Second",
      "",
      "> Quote",
      "",
      "```ts",
      "const value = 1;",
      "```",
      "",
      "<aside>",
      "🎯 **Core idea:** Keep the editor semantic.",
      "</aside>",
    ].join("\n");

    editor = new Editor({
      extensions: documentEditorExtensions,
      content: markdownToTiptapDocument(markdown),
    });

    const output = tiptapToMarkdown(editor);

    expect(output).toContain("# Project Research");
    expect(output).toContain("This is **important** and *useful*.");
    expect(output).toContain("- First");
    expect(output).toContain("> Quote");
    expect(output).toContain("```ts");
    expect(output).toContain("<aside>");
    expect(output).toContain("Core idea");
  });

  it("round-trips aside icons without absorbing the following code or divider", () => {
    const markdown = [
      "<aside>",
      "🎯",
      "",
      "**Core idea:** Keep the source semantic.",
      "</aside>",
      "",
      "```jsx",
      "cd 'C:\\Andrew\\Projects\\Portfolio Projects\\2026-08\\md-pdf-preview'",
      "```",
      "",
      "---",
    ].join("\n");

    editor = new Editor({
      extensions: documentEditorExtensions,
      content: markdownToTiptapDocument(markdown),
    });

    const reparsed = parseMarkdownDocument(tiptapToMarkdown(editor));

    expect(reparsed.blocks.map((block) => block.kind)).toEqual([
      "callout",
      "code",
      "thematicBreak",
    ]);
    expect(reparsed.blocks[0].callout).toMatchObject({
      icon: "🎯",
      innerMarkdown: "**Core idea:** Keep the source semantic.",
    });
    expect(reparsed.blocks[1].node).toMatchObject({ type: "code", lang: "jsx" });
  });

  it("round-trips task completion state through canonical Markdown", () => {
    editor = new Editor({
      extensions: documentEditorExtensions,
      content: markdownToTiptapDocument(
        "- [ ] Open task\n- [x] Completed task",
      ),
    });

    const output = tiptapToMarkdown(editor);

    expect(output).toContain("- [ ] Open task");
    expect(output).toContain("- [x] Completed task");
  });
});
