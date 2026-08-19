import { afterEach, describe, expect, it } from "vitest";

import { useWorkspaceStore, WORKSPACE_ZOOM } from "./workspace.store";

function resetStore() {
  useWorkspaceStore.setState({
    markdownZoom: WORKSPACE_ZOOM.default,
    previewZoom: WORKSPACE_ZOOM.default,
    responsiveZoomInitialized: false,
  });
}

describe("workspace zoom store", () => {
  afterEach(resetStore);

  it("starts all workspace zooms at 50% on a small screen", () => {
    useWorkspaceStore.getState().initializeViewportZoom(true);

    expect(useWorkspaceStore.getState().markdownZoom).toBe(
      WORKSPACE_ZOOM.mobileDefault,
    );
    expect(useWorkspaceStore.getState().previewZoom).toBe(
      WORKSPACE_ZOOM.mobileDefault,
    );
  });

  it("keeps a changed zoom instead of reinitializing it", () => {
    useWorkspaceStore.getState().initializeViewportZoom(true);
    useWorkspaceStore.getState().setPreviewZoom(80);
    useWorkspaceStore.getState().initializeViewportZoom(true);

    expect(useWorkspaceStore.getState().previewZoom).toBe(80);
  });
});
