import { describe, expect, it } from "vitest";

import { isMarkdownPaste, markdownPasteContent } from "./markdownPaste";

describe("Markdown paste detection", () => {
  it("recognizes block Markdown without parsing ordinary text", () => {
    expect(isMarkdownPaste("# Heading\n\n**Important** text")).toBe(true);
    expect(isMarkdownPaste("A normal sentence to paste.")).toBe(false);
  });

  it("converts recognized clipboard Markdown through the shared document parser", () => {
    const content = markdownPasteContent(
      [
        "<aside>",
        "🎯",
        "",
        "**Core idea:** Paste this semantically.",
        "</aside>",
        "",
        "- [ ] Keep the task state.",
        "",
        "```jsx",
        "const value = 1;",
        "```",
      ].join("\n"),
    );

    expect(content?.map((node) => node.type)).toEqual([
      "callout",
      "taskList",
      "codeBlock",
    ]);
    expect(content?.[0]?.attrs).toMatchObject({ icon: "🎯" });
    expect(content?.[1]?.content?.[0]?.attrs).toEqual({ checked: false });
    expect(content?.[2]?.attrs).toEqual({ language: "jsx" });
  });

  it("converts pasted Markdown images into standalone image blocks", () => {
    const content = markdownPasteContent(
      [
        "# Atlas Norte",
        "",
        "![Vista aerea](https://example.com/city.jpg)",
        "",
        "---",
      ].join("\n"),
    );

    expect(content?.map((node) => node.type)).toEqual([
      "heading",
      "image",
      "horizontalRule",
    ]);
    expect(content?.[1]?.attrs).toMatchObject({
      src: "https://example.com/city.jpg",
      alt: "Vista aerea",
    });
  });
});
