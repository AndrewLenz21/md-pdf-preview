import { afterEach, describe, expect, it } from "vitest";

import { useWorkspaceSessionStore } from "./workspace-session.store";

afterEach(() => {
  useWorkspaceSessionStore.setState({
    activeSource: "local",
    selectedDocumentId: null,
    selectedDocumentSource: null,
  });
});

describe("workspace session selection", () => {
  it("keeps the selected document when the active source changes", () => {
    useWorkspaceSessionStore
      .getState()
      .selectDocument("cloud-document", "cloud");

    useWorkspaceSessionStore.getState().setActiveSource("local");

    expect(useWorkspaceSessionStore.getState()).toMatchObject({
      activeSource: "local",
      selectedDocumentId: "cloud-document",
      selectedDocumentSource: "cloud",
    });
  });

  it("clears both the document and its source", () => {
    useWorkspaceSessionStore
      .getState()
      .selectDocument("cloud-document", "cloud");

    useWorkspaceSessionStore.getState().clearSelection();

    expect(useWorkspaceSessionStore.getState()).toMatchObject({
      selectedDocumentId: null,
      selectedDocumentSource: null,
    });
  });
});
