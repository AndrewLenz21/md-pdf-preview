// @vitest-environment jsdom

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { parseMarkdownDocument } from "@/modules/dashboard/document";
import { DocumentBlockRenderer } from "@/modules/dashboard/document/rendering/DocumentBlockRenderer";
import { createDocumentLayoutUnits } from "../components/paper-preview/pagination/documentLayout";

import { measureCodeBlock } from "./codeMeasurement";

describe("browser code geometry measurement", () => {
  it("matches the canonical renderer's terminal newline contract", () => {
    const [block] = parseMarkdownDocument("```ts\nfirst\nsecond\n```").blocks;
    const metadata = createDocumentLayoutUnits([block])[0].codeMetadata;
    const { container } = render(
      React.createElement(DocumentBlockRenderer, { block, definitions: [] }),
    );

    expect(container.querySelector("pre > code")?.textContent).toBe(
      metadata?.renderedContent,
    );
  });

  it("derives logical-line heights from Range rectangles", () => {
    const [block] = parseMarkdownDocument("```ts\nfirst\nsecond\n```").blocks;
    const [unit] = createDocumentLayoutUnits([block]);
    const root = document.createElement("div");
    root.innerHTML = "<pre><code>first\nsecond\n</code></pre>";
    const textNode = root.querySelector("code")?.firstChild;

    if (!(textNode instanceof Text)) {
      throw new Error("Expected one code text node");
    }

    let startOffset = 0;
    let endOffset = 0;
    vi.spyOn(document, "createRange").mockImplementation(() => {
      return {
        setStart: (_node: Node, offset: number) => {
          startOffset = offset;
        },
        setEnd: (_node: Node, offset: number) => {
          endOffset = offset;
        },
        getClientRects: () => {
          const top = startOffset < 6 ? 0 : 20;

          return [
            {
              top,
              bottom: top + 20,
              height: 20,
            } as DOMRect,
          ];
        },
      } as unknown as Range;
    });

    const profile = measureCodeBlock(
      root,
      {
        id: unit.id,
        parentBlockId: block.id,
        source: unit.source,
        splittingStrategy: "code",
        codeMetadata: unit.codeMetadata!,
      },
      40,
    );

    expect(profile?.lines.map((line) => line.height)).toEqual([20, 20]);
    expect(profile?.lines[0].gapAfter).toBe(0);
    expect(endOffset).toBeGreaterThan(startOffset);
  });
});
