import { afterEach, describe, expect, it } from "vitest";

import { useDocumentEditorStore, useWorkspaceStore, WORKSPACE_ZOOM } from "./index";

describe("document editor zoom store", () => {
  afterEach(() => {
    useDocumentEditorStore.getState().resetZoom();
    useWorkspaceStore.getState().resetMarkdownZoom();
    useWorkspaceStore.getState().resetPreviewZoom();
  });

  it("uses the shared zoom range without sharing document zoom state", () => {
    useDocumentEditorStore.getState().setZoom(50);

    expect(useDocumentEditorStore.getState().zoom).toBe(50);
    expect(useWorkspaceStore.getState().markdownZoom).toBe(
      WORKSPACE_ZOOM.default,
    );
    expect(useWorkspaceStore.getState().previewZoom).toBe(
      WORKSPACE_ZOOM.default,
    );
  });
});
