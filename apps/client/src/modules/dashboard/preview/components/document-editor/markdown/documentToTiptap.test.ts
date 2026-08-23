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

  it("converts an image-only paragraph into a standalone image block", () => {
    const document = markdownToTiptapDocument(
      "![Vista aerea](https://example.com/city.jpg)",
    );

    expect(document.content).toEqual([
      {
        type: "image",
        attrs: {
          src: "https://example.com/city.jpg",
          alt: "Vista aerea",
          title: null,
        },
      },
    ]);
  });

  it("splits a paragraph around an inline image into text and image blocks", () => {
    const document = markdownToTiptapDocument(
      "Before ![Vista aerea](https://example.com/city.jpg) after",
    );

    expect(document.content).toEqual([
      {
        type: "paragraph",
        content: [{ type: "text", text: "Before " }],
      },
      {
        type: "image",
        attrs: {
          src: "https://example.com/city.jpg",
          alt: "Vista aerea",
          title: null,
        },
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: " after" }],
      },
    ]);
  });

  it("keeps the image title attribute", () => {
    const document = markdownToTiptapDocument(
      '![Vista aerea](https://example.com/city.jpg "Ciudad")',
    );

    expect(document.content?.[0]).toMatchObject({
      type: "image",
      attrs: {
        src: "https://example.com/city.jpg",
        alt: "Vista aerea",
        title: "Ciudad",
      },
    });
  });
});
