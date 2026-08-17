// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { parseMarkdownDocument } from "../parser/markdownDocument";
import { DocumentBlockRenderer } from "./DocumentBlockRenderer";

describe("DocumentBlockRenderer", () => {
  it("preserves the existing Markdown, callout, and unsupported block output", () => {
    const parsed = parseMarkdownDocument(
      [
        "# Heading",
        "",
        "| Name | Value |",
        "| --- | --- |",
        "| Example | 1 |",
        "",
        "```ts",
        "const value = 1;",
        "```",
        "",
        "<aside>",
        "🎯 Callout",
        "</aside>",
        "",
        "<mark>Unsupported</mark>",
      ].join("\n"),
    );

    const { container } = render(
      <>
        {parsed.blocks.map((block) => (
          <DocumentBlockRenderer
            key={block.id}
            block={block}
            definitions={parsed.definitions}
          />
        ))}
      </>,
    );

    expect(container.querySelector("h1")?.textContent).toBe("Heading");
    expect(container.querySelector("table")).toBeTruthy();
    expect(container.querySelector("pre code")?.textContent).toContain(
      "const value = 1;",
    );
    expect(container.querySelector(".document-callout-icon")?.textContent).toBe(
      "🎯",
    );
    expect(
      container.querySelector(".document-unsupported-block code")?.textContent,
    ).toBe("<mark>Unsupported</mark>");
  });
});
