// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  attachDocumentPageBreakMarkers,
  getDocumentPageBreakPositions,
  getPageBreakAnchors,
  getPageBreakPositions,
} from "./documentPageBreakMarkers";

describe("document page break markers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("anchors the first text of the final three pages in a four-page document", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    let rangeEndContainer: Node | null = null;
    const range = {
      get endContainer() {
        return rangeEndContainer;
      },
      getClientRects: () => [{ bottom: 120, top: 120 } as DOMRect],
      getBoundingClientRect: () => ({ bottom: 120, top: 120 }) as DOMRect,
      setEnd: (node: Node) => {
        rangeEndContainer = node;
      },
      setStart: () => undefined,
    } as unknown as Range;
    vi.spyOn(document, "createRange").mockReturnValue(range);

    const documentCanvas = document.createElement("div");
    documentCanvas.innerHTML = `
      <div class="document-editor-content">
        <h2>Section</h2>
        <p>Content from the first page ending phrase</p>
        <p>Page two starts here.</p>
        <p>Page three starts here.</p>
        <p>Page four starts here.</p>
      </div>
    `;
    Object.defineProperty(documentCanvas, "scrollHeight", { value: 500 });
    Object.defineProperty(documentCanvas, "scrollTop", { value: 4 });
    vi.spyOn(documentCanvas, "getClientRects").mockReturnValue(
      [{} as DOMRect] as unknown as DOMRectList,
    );
    vi.spyOn(documentCanvas, "getBoundingClientRect").mockReturnValue({
      top: 10,
    } as DOMRect);

    const previewCanvas = document.createElement("div");
    previewCanvas.innerHTML = `
      <section data-document-page="1">
        <div data-document-block-root="first">
          <p>Content from the first page ending phrase</p>
        </div>
      </section>
      <section data-document-page="2">
        <div data-document-block-root="second">
          <p>Page two starts here.</p>
        </div>
      </section>
      <section data-document-page="3">
        <div data-document-block-root="third">
          <p>Page three starts here.</p>
        </div>
      </section>
      <section data-document-page="4">
        <div data-document-block-root="fourth">
          <p>Page four starts here.</p>
        </div>
      </section>
    `;

    expect(documentCanvas.querySelector(".document-editor-content")).toBeTruthy();
    expect(previewCanvas.querySelectorAll("[data-document-page]")).toHaveLength(4);
    expect(documentCanvas.getClientRects()).toHaveLength(1);
    expect(getPageBreakPositions(documentCanvas, previewCanvas)).toEqual([
      106,
      106,
      106,
    ]);
    expect(
      getDocumentPageBreakPositions(
        documentCanvas,
        getPageBreakAnchors(previewCanvas),
      ),
    ).toEqual([106, 106, 106]);

    const positions: number[][] = [];
    const detach = attachDocumentPageBreakMarkers(
      documentCanvas,
      previewCanvas,
      (nextPositions) => positions.push(nextPositions),
    );

    expect(positions.at(-1)).toEqual([106, 106, 106]);
    detach();
  });

  it("anchors the Product proposal break above PDF Preview Experience", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);

    let rangeStartNode: Text | null = null;
    const range = {
      getClientRects: () => [
        {
          top: rangeStartNode?.nodeValue?.includes("PDF") ? 300 : 180,
          bottom: 300,
        } as DOMRect,
      ],
      getBoundingClientRect: () => ({ top: 180, bottom: 300 }) as DOMRect,
      setEnd: () => undefined,
      setStart: (node: Node) => {
        rangeStartNode = node as Text;
      },
    } as unknown as Range;
    vi.spyOn(document, "createRange").mockReturnValue(range);

    const documentCanvas = document.createElement("div");
    documentCanvas.innerHTML = `
      <div class="document-editor-content">
        <ul>
          <li><p>📥 Export the final result as PDF.</p></li>
          <li><p>💾 Keep a local history of previous documents/previews.</p></li>
        </ul>
        <h2>📐 PDF Preview Experience</h2>
        <p>The preview is the heart of the product.</p>
      </div>
    `;
    Object.defineProperty(documentCanvas, "scrollHeight", { value: 500 });
    Object.defineProperty(documentCanvas, "scrollTop", { value: 0 });
    vi.spyOn(documentCanvas, "getClientRects").mockReturnValue(
      [{} as DOMRect] as unknown as DOMRectList,
    );
    vi.spyOn(documentCanvas, "getBoundingClientRect").mockReturnValue({
      top: 10,
    } as DOMRect);

    const previewCanvas = document.createElement("div");
    previewCanvas.innerHTML = `
      <section data-document-page="1">
        <div data-document-block-root="list">
          <ul>
            <li><p>📥 Export the final result as PDF.</p></li>
            <li><p>💾 Keep a local history of previous documents/previews.</p></li>
          </ul>
        </div>
      </section>
      <section data-document-page="2">
        <div data-document-block-root="heading">
          <h2>📐 PDF Preview Experience</h2>
        </div>
      </section>
    `;

    const positions = getPageBreakPositions(documentCanvas, previewCanvas);

    expect((rangeStartNode as Text | null)?.nodeValue).toContain("PDF");
    expect(positions).toEqual([282]);
  });

  it("does not recalculate when the marker overlay mutates", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);

    let rangeStartNode: Text | null = null;
    const range = {
      getClientRects: () => [{ top: 100 } as DOMRect],
      getBoundingClientRect: () => ({ top: 100 }) as DOMRect,
      setEnd: () => undefined,
      setStart: (node: Node) => {
        rangeStartNode = node as Text;
      },
    } as unknown as Range;
    vi.spyOn(document, "createRange").mockReturnValue(range);

    const documentCanvas = document.createElement("div");
    documentCanvas.innerHTML = `
      <div class="document-editor-content">
        <p>Content from the first page.</p>
        <p>Second page starts here.</p>
      </div>
    `;
    Object.defineProperty(documentCanvas, "scrollHeight", { value: 500 });
    Object.defineProperty(documentCanvas, "clientHeight", { value: 100 });
    vi.spyOn(documentCanvas, "getClientRects").mockReturnValue(
      [{} as DOMRect] as unknown as DOMRectList,
    );
    vi.spyOn(documentCanvas, "getBoundingClientRect").mockReturnValue({
      top: 0,
    } as DOMRect);

    const previewCanvas = document.createElement("div");
    previewCanvas.innerHTML = `
      <section data-document-page="1">
        <div data-document-block-root="first">
          <p>Content from the first page.</p>
        </div>
      </section>
      <section data-document-page="2">
        <div data-document-block-root="second">
          <p>Second page starts here.</p>
        </div>
      </section>
    `;
    const mutationCallbacks: MutationCallback[] = [];

    class TestMutationObserver {
      constructor(callback: MutationCallback) {
        mutationCallbacks.push(callback);
      }

      observe() {}

      disconnect() {}
    }

    vi.stubGlobal("MutationObserver", TestMutationObserver);

    const positions: number[][] = [];
    const detach = attachDocumentPageBreakMarkers(
      documentCanvas,
      previewCanvas,
      (nextPositions) => positions.push(nextPositions),
    );

    expect((rangeStartNode as Text | null)?.nodeValue).toContain("Second");
    expect(positions).toEqual([[92]]);

    const overlay = document.createElement("div");
    overlay.className = "document-page-break-overlay";
    const marker = document.createElement("div");
    marker.className = "document-page-break-marker";
    overlay.append(marker);
    mutationCallbacks[0]?.([
      {
        addedNodes: [marker],
        removedNodes: [],
        target: overlay,
        type: "childList",
      } as unknown as MutationRecord,
    ], {} as MutationObserver);

    expect(positions).toEqual([[92]]);
    detach();
  });
});
