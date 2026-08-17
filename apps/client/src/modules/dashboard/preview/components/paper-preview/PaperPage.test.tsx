// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { parseMarkdownDocument } from "@/modules/dashboard/document";
import { createPageFragments } from "./pagination/pageFragments";
import { createDocumentLayoutUnits } from "./pagination/documentLayout";
import { PaperPage } from "./PaperPage";
import { getPaperPreviewDimensions } from "./paper-sizes";

describe("PaperPage", () => {
  it("renders read-only paper content with a footer", () => {
    const [block] = parseMarkdownDocument("# Preview\n\nRead only content.").blocks;
    const units = createDocumentLayoutUnits([block]);
    const fragments = createPageFragments(units, units);
    const dimensions = getPaperPreviewDimensions("a4", 100);

    const { container } = render(
      <PaperPage
        blocks={[block]}
        definitions={[]}
        documentTitle="Research"
        pageIndex={0}
        pagePlan={{
          id: "page-1",
          fragments,
          contentHeight: 100,
          isOversized: false,
        }}
        paperDimensions={dimensions}
        animateEntry={false}
      />,
    );

    expect(container.querySelector("[contenteditable]")).toBeNull();
    expect(container.querySelector(".document-page-footer")).toBeTruthy();
    expect(container.querySelector("[data-document-page=\"1\"]")).toBeTruthy();
  });

  it("renders the shared aside icon beside its Markdown content", () => {
    const [block] = parseMarkdownDocument(
      [
        "<aside>",
        "🎯",
        "",
        "**Core idea:** Read-only preview.",
        "</aside>",
      ].join("\n"),
    ).blocks;
    const units = createDocumentLayoutUnits([block]);
    const fragments = createPageFragments(units, units);
    const dimensions = getPaperPreviewDimensions("a4", 100);

    const { container } = render(
      <PaperPage
        blocks={[block]}
        definitions={[]}
        documentTitle="Research"
        pageIndex={0}
        pagePlan={{
          id: "page-1",
          fragments,
          contentHeight: 100,
          isOversized: false,
        }}
        paperDimensions={dimensions}
        animateEntry={false}
      />,
    );

    expect(container.querySelector(".document-callout-icon")?.textContent).toBe("🎯");
    expect(container.querySelector("strong")?.textContent).toBe("Core idea:");
  });

  it("renders the explicit fragment order supplied by the page plan", () => {
    const [block] = parseMarkdownDocument(
      Array.from({ length: 900 }, (_, index) => `word-${index}`).join(" "),
    ).blocks;
    const units = createDocumentLayoutUnits([block]);
    const fragments = units.flatMap((unit) =>
      createPageFragments([unit], units),
    );
    const dimensions = getPaperPreviewDimensions("a4", 100);

    const { container } = render(
      <PaperPage
        blocks={[block]}
        definitions={[]}
        documentTitle="Research"
        pageIndex={0}
        pagePlan={{
          id: "page-1",
          fragments,
          contentHeight: 100,
          isOversized: false,
        }}
        paperDimensions={dimensions}
        animateEntry={false}
      />,
    );

    expect(
      [...container.querySelectorAll<HTMLElement>("[data-document-block-root]")].map(
        (element) => element.dataset.documentBlockRoot,
      ),
    ).toEqual(fragments.map((fragment) => fragment.id));
  });
});
