// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import {
  CASH_BASIS_TAX_VIEW_MARKDOWN,
  MOCK_DOCUMENTS,
} from "@/modules/dashboard/constants/mock-documents";

import { PaperPreview } from "./PaperPreview";
import { getPaperPreviewDimensions } from "./paper-sizes";

class TestResizeObserver {
  observe() {}

  disconnect() {}
}

describe("PaperPreview measurement pipeline", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.spyOn(document, "createRange").mockImplementation(
      () =>
        ({
          getClientRects: () => [],
          setEnd: () => undefined,
          setStart: () => undefined,
        }) as unknown as Range,
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const height = this.dataset.documentMeasureParagraphCandidate
          ? this.querySelector(".document-callout")
            ? 100
            : 20
          : this.dataset.documentMeasureBlock
            ? 100
            : this.tagName === "TABLE"
              ? 100
              : this.tagName === "THEAD"
                ? 30
                : this.tagName === "TR"
                  ? 70
            : this.tagName === "LI"
              ? 20
              : 0;
        const top = Number(this.dataset.measureTop ?? "0");

        return {
          bottom: top + height,
          height,
          left: 0,
          right: 0,
          toJSON: () => ({}),
          top,
          width: 0,
          x: 0,
          y: 0,
        };
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("falls back to atomic rendering when a list profile is invalid", () => {
    const document = MOCK_DOCUMENTS[0];
    const { container } = render(
      <PaperPreview
        documentTitle={document.title}
        markdown={document.content ?? ""}
        paperDimensions={getPaperPreviewDimensions("a4", 100)}
      />,
    );
    expect(container.querySelector(".document-pagination-ready")).toBeTruthy();
    expect(
      container
        .querySelector("[data-document-invalid-measurements]")
        ?.getAttribute("data-document-invalid-measurements"),
    ).toContain("list-5-block-0");
    expect(container.querySelectorAll("[data-document-page]").length).toBeGreaterThan(0);
  });

  it("falls back to atomic rendering when a code profile is invalid", () => {
    const markdown = [
      "Before the code.",
      "",
      "```ts",
      "const first = 1;",
      "const second = 2;",
      "```",
    ].join("\n");
    const { container } = render(
      <PaperPreview
        documentTitle="Code fallback"
        markdown={markdown}
        paperDimensions={getPaperPreviewDimensions("a4", 100)}
      />,
    );
    const invalidMeasurements = container.querySelector(
      "[data-document-invalid-measurements]",
    );

    expect(container.querySelector(".document-pagination-ready")).toBeTruthy();
    expect(invalidMeasurements?.getAttribute("data-document-invalid-measurements")).toContain(
      "code-1-block-0",
    );
    expect(container.querySelectorAll("[data-document-page]").length).toBeGreaterThan(0);
  });

  it("keeps a valid canonical code profile on the dynamic path", () => {
    let rangeStart = 0;
    vi.spyOn(document, "createRange").mockImplementation(
      () =>
        ({
          getClientRects: () => {
            const top = rangeStart < 4 ? 0 : 20;

            return [
              {
                bottom: top + 20,
                height: 20,
                top,
              } as DOMRect,
            ];
          },
          setEnd: () => undefined,
          setStart: (_node: Node, offset: number) => {
            rangeStart = offset;
          },
        }) as unknown as Range,
    );
    vi.spyOn(window, "getComputedStyle").mockImplementation(
      () =>
        ({
          fontSize: "16px",
          lineHeight: "20px",
        }) as CSSStyleDeclaration,
    );
    const markdown = [
      "```ts",
      "const first = 1;",
      "const second = 2;",
      "```",
    ].join("\n");
    const { container } = render(
      <PaperPreview
        documentTitle="Code profile"
        markdown={markdown}
        paperDimensions={getPaperPreviewDimensions("a4", 100)}
      />,
    );

    expect(container.querySelector(".document-pagination-ready")).toBeTruthy();
    expect(container.querySelector("[data-document-invalid-measurements]")).toBeNull();
    expect(container.querySelectorAll("[data-document-page]").length).toBeGreaterThan(0);
  });

  it("renders intentional source whitespace as a visible preview spacer", () => {
    const markdown = [
      "# Before",
      "",
      "",
      "",
      "",
      "# After",
    ].join("\n");
    const { container } = render(
      <PaperPreview
        documentTitle="Whitespace"
        markdown={markdown}
        paperDimensions={getPaperPreviewDimensions("a4", 100)}
      />,
    );

    expect(container.querySelector("[data-document-measure-blank-space]")).toBeTruthy();
    expect(container.querySelector(".document-pagination-ready")).toBeTruthy();
    expect(container.querySelectorAll(".document-blank-space").length).toBeGreaterThan(0);
  });

  it("renders source whitespace between a heading and a task list", () => {
    const markdown = [
      "### Phase 3 — Local history",
      "",
      "",
      "- [ ] Save previews locally.",
      "- [ ] Reopen/edit previous documents.",
    ].join("\n");
    const { container } = render(
      <PaperPreview
        documentTitle="Whitespace before task list"
        markdown={markdown}
        paperDimensions={getPaperPreviewDimensions("a4", 100)}
      />,
    );

    expect(container.querySelector("[data-document-measure-blank-space]")).toBeTruthy();
    expect(container.querySelector(".document-pagination-ready")).toBeTruthy();
    const blankSpace = container.querySelector<HTMLElement>(".document-blank-space");

    expect(blankSpace).toBeTruthy();
    expect(blankSpace?.style.getPropertyValue("--document-blank-line-count")).toBe(
      "1",
    );
  });

  it("shows a rendering state while measurements are pending", () => {
    vi.mocked(window.requestAnimationFrame).mockImplementation(() => 1);

    const { container } = render(
      <PaperPreview
        documentTitle="Pending preview"
        markdown="# Pending"
        paperDimensions={getPaperPreviewDimensions("a4", 100)}
      />,
    );

    expect(
      container.querySelector('[aria-busy="true"] .document-preview-rendering-overlay'),
    ).toBeTruthy();
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Rendering preview",
    );
  });

  it("profiles the cash-basis tax tables across the preview pages", () => {
    const { container } = render(
      <PaperPreview
        documentTitle="Cash-Basis Tax View"
        markdown={CASH_BASIS_TAX_VIEW_MARKDOWN}
        paperDimensions={getPaperPreviewDimensions("a4", 100)}
      />,
    );

    const pages = [...container.querySelectorAll<HTMLElement>("[data-document-page]")];
    const monthlyRevenueTablePages = pages.reduce<number[]>(
      (result, page, index) => {
        const hasMonthlyRevenueTable = [...page.querySelectorAll("table")].some(
          (table) => table.textContent?.includes("Est. final tax + INPS"),
        );

        return hasMonthlyRevenueTable ? [...result, index + 1] : result;
      },
      [],
    );

    expect(pages.length).toBeGreaterThan(0);
    expect(monthlyRevenueTablePages).toHaveLength(1);
  });
});
