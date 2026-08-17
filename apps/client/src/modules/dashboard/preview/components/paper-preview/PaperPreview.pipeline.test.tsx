// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { MOCK_DOCUMENTS } from "@/modules/dashboard/constants/mock-documents";

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
          ? 20
          : this.dataset.documentMeasureBlock
            ? 100
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
});
