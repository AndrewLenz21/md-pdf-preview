// @vitest-environment jsdom

import { fireEvent, render, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { parseMarkdownDocument } from "@/modules/dashboard/document";
import { MOCK_DOCUMENTS } from "@/modules/dashboard/constants/mock-documents";
import type { PreviewEditingController } from "../../editing/previewEditing.types";
import { usePreviewEditing } from "../../editing/usePreviewEditing";
import {
  getPreviewListItems,
  isEditablePreviewFragment,
} from "../../editing/selectionMapping";
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

  it("only enables direct editing for a complete table fragment", () => {
    const markdown = [
      "| Name | Value |",
      "| --- | --- |",
      "| Total | 100 |",
    ].join("\n");
    const [block] = parseMarkdownDocument(markdown).blocks;
    const units = createDocumentLayoutUnits([block]);
    const [fragment] = createPageFragments(units, units);

    expect(fragment).toBeTruthy();
    expect(isEditablePreviewFragment(fragment!, block)).toBe(true);
    expect(
      isEditablePreviewFragment(
        { ...fragment!, continuation: "end" },
        block,
      ),
    ).toBe(false);
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

  it("activates only the clicked editable fragment", async () => {
    const markdown = "## PROGRESS";
    const [block] = parseMarkdownDocument(markdown).blocks;
    const units = createDocumentLayoutUnits([block]);
    const fragments = createPageFragments(units, units);
    const dimensions = getPaperPreviewDimensions("a4", 100);

    function EditablePage() {
      const [active, setActive] = useState(false);
      const previewEditing: PreviewEditingController = {
        canEditFragment: () => true,
        isEditableFragment: () => active,
        onFragmentMouseDown: () => setActive(true),
        onEditorMount: () => undefined,
        onEditorChange: () => undefined,
        onEditorKeyDown: () => undefined,
      };

      return (
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
          previewEditing={previewEditing}
        />
      );
    }

    const { container } = render(<EditablePage />);

    expect(container.querySelector("[contenteditable]")).not.toBeTruthy();

    const editableFragment = container.querySelector<HTMLElement>(
      '[data-preview-editable-fragment="true"]',
    );

    expect(editableFragment).toBeTruthy();
    fireEvent.mouseDown(editableFragment!);

    await waitFor(() => {
      expect(container.querySelector('[contenteditable="true"]')).toBeTruthy();
    });
    expect(container.querySelector(".document-editor-content > p")).not.toBeTruthy();
  });

  it("marks a simple list fragment as editable", () => {
    const markdown = "- First item\n- Second item";
    const [block] = parseMarkdownDocument(markdown).blocks;
    const units = createDocumentLayoutUnits([block]);
    const fragments = createPageFragments(units, units);
    const dimensions = getPaperPreviewDimensions("a4", 100);

    function EditableListPage() {
      const previewEditing = usePreviewEditing({
        markdown,
        onMarkdownChange: () => undefined,
      });

      return (
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
          previewEditing={previewEditing}
        />
      );
    }

    const { container } = render(<EditableListPage />);

    expect(
      container.querySelector('[data-preview-editable-fragment="true"]'),
    ).toBeTruthy();
  });

  it("marks every supported Project Research fragment as editable", () => {
    const markdown = MOCK_DOCUMENTS[0].content ?? "";
    const blocks = parseMarkdownDocument(markdown).blocks;
    const units = createDocumentLayoutUnits(blocks, markdown);
    const fragments = createPageFragments(units, units);
    const dimensions = getPaperPreviewDimensions("a4", 100);

    function EditableDocumentPage() {
      const previewEditing = usePreviewEditing({
        markdown,
        onMarkdownChange: () => undefined,
      });

      return (
        <PaperPage
          blocks={blocks}
          definitions={[]}
          documentTitle="Project Research"
          pageIndex={0}
          pagePlan={{
            id: "page-1",
            fragments,
            contentHeight: 100,
            isOversized: false,
          }}
          paperDimensions={dimensions}
          animateEntry={false}
          previewEditing={previewEditing}
        />
      );
    }

    const { container } = render(<EditableDocumentPage />);
    const supportedFragments = fragments.filter(
      (fragment) => fragment.kind !== "blankSpace",
    );
    const listBlocks = blocks.filter((block) => block.kind === "list");

    expect(listBlocks.map((block) => getPreviewListItems(block).length)).toEqual([
      3,
      3,
    ]);

    expect(
      [...container.querySelectorAll<HTMLElement>('[data-preview-editable-fragment="true"]')].map(
        (element) => element.dataset.previewFragmentId,
      ),
    ).toEqual(supportedFragments.map((fragment) => fragment.id));
  });
});
