// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MOCK_DOCUMENTS } from "@/modules/dashboard/constants/mock-documents";

import { DocumentPreview } from "./DocumentPreview";

describe("DocumentPreview page-break overlay", () => {
  beforeEach(() => {
    class TestResizeObserver {
      observe() {}

      disconnect() {}
    }

    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const height = this.dataset.documentMeasureBlock ? 100 : 0;

        return {
          bottom: height,
          height,
          left: 0,
          right: 0,
          toJSON: () => ({}),
          top: 0,
          width: 0,
          x: 0,
          y: 0,
        };
      },
    );
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue(
      [{} as DOMRect] as unknown as DOMRectList,
    );
    vi.spyOn(document, "createRange").mockReturnValue({
      getClientRects: () => [
        { bottom: 20, height: 20, top: 0 } as DOMRect,
      ],
      getBoundingClientRect: () => ({ bottom: 20, top: 0 }) as DOMRect,
      setEnd: () => undefined,
      setStart: () => undefined,
    } as unknown as Range);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders page-break markers in the non-embedded document view", () => {
    const document = MOCK_DOCUMENTS[0];

    const { container } = render(
      <DocumentPreview
        document={document}
        mode="document"
        scrollScope="mobile"
        onModeChange={() => undefined}
        onContentChange={() => undefined}
        pageBreakMarkers={[240]}
      />,
    );

    const marker = container.querySelector<HTMLElement>(
      ".document-page-break-marker",
    );

    expect(container.querySelector('[data-document-mode="document"]')).toBeTruthy();
    expect(marker).toBeTruthy();
    expect(marker?.style.top).toBe("240px");
    expect(marker?.textContent).toContain("Possible page break");
  });

});
