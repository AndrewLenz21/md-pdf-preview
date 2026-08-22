// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LOCAL_WORKSPACE_ITEMS } from "@/modules/dashboard/constants/document-workspaces";
import type { WorkspaceDocumentItem } from "@/modules/dashboard/document/model/document.types";

import { DocumentPreview } from "./DocumentPreview";

function getDocument(): WorkspaceDocumentItem {
  const document = LOCAL_WORKSPACE_ITEMS.find(
    (item): item is WorkspaceDocumentItem =>
      item.type === "document" && item.id === "project-research",
  );

  if (!document) {
    throw new Error("Test document is missing");
  }

  return document;
}

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
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(
      () => undefined,
    );
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
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
      {} as DOMRect,
    ] as unknown as DOMRectList);
    vi.spyOn(document, "createRange").mockReturnValue({
      getClientRects: () => [{ bottom: 20, height: 20, top: 0 } as DOMRect],
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
    const document = getDocument();

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

    expect(
      container.querySelector('[data-document-mode="document"]'),
    ).toBeTruthy();
    expect(marker).toBeTruthy();
    expect(marker?.style.top).toBe("240px");
    expect(marker?.textContent).toContain("Possible page break");
  });

  it("uses the window scroll for the non-embedded preview view", () => {
    const document = getDocument();

    const { container } = render(
      <DocumentPreview
        document={document}
        mode="preview"
        scrollScope="mobile"
        showToolbar={false}
        onModeChange={() => undefined}
        onContentChange={() => undefined}
      />,
    );

    const root = container.querySelector('[data-document-mode="preview"]');
    const canvas = root?.querySelector(".document-preview-canvas");

    expect(root?.className).not.toContain("overflow-hidden");
    expect(canvas?.className).not.toContain("overflow-auto");
  });

  it("keeps the mobile toolbar outside the preview canvas", () => {
    const document = getDocument();

    const { container } = render(
      <DocumentPreview
        document={document}
        mode="preview"
        scrollScope="mobile"
        onModeChange={() => undefined}
        onContentChange={() => undefined}
      />,
    );

    const root = container.querySelector('[data-document-mode="preview"]');
    const toolbar = root?.querySelector(".mobile-preview-toolbar");
    const canvas = root?.querySelector(".document-preview-canvas");

    expect(toolbar?.parentElement).toBe(root);
    expect(canvas?.contains(toolbar ?? null)).toBe(false);
  });
});
