import { describe, expect, it } from "vitest";

import { markdownToTiptapDocument } from "./documentToTiptap";

describe("Markdown to Tiptap conversion", () => {
  it("creates separate semantic blocks", () => {
    expect(markdownToTiptapDocument("# Updated heading\n\nUpdated paragraph.")).toEqual({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Updated heading" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Updated paragraph." }],
        },
      ],
    });
  });

  it("represents an aside icon separately while preserving marks and following blocks", () => {
    const document = markdownToTiptapDocument(
      [
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
      ].join("\n"),
    );
    const [callout, code, divider] = document.content ?? [];

    expect(callout).toMatchObject({
      type: "callout",
      attrs: { icon: "🎯", variant: "info" },
    });
    expect(callout.content?.[0]).toEqual({
      type: "paragraph",
      content: [
        { type: "text", text: "Core idea:", marks: [{ type: "bold" }] },
        { type: "text", text: " Keep the source semantic." },
      ],
    });
    expect(code).toMatchObject({
      type: "codeBlock",
      attrs: { language: "jsx" },
    });
    expect(divider).toEqual({ type: "horizontalRule" });
  });
});
