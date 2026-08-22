import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CLOUD_WORKSPACE_ITEMS,
  LOCAL_WORKSPACE_ITEMS,
} from "@/modules/dashboard/constants/document-workspaces";
import type { WorkspaceDocumentItem } from "@/modules/dashboard/document/model/document.types";

import {
  DOCUMENT_CONTENT_DEBOUNCE_MS,
  MAX_MARKDOWN_CHARACTERS,
  getWorkspaceRoute,
  isWorkspaceDocument,
  isWorkspaceFolder,
  normalizeMarkdownDocument,
  useWorkspaceItemsStore,
} from "./workspace-items.store";

const initialLocalItems = useWorkspaceItemsStore.getState().localItems;
const initialCloudItems = useWorkspaceItemsStore.getState().cloudItems;

function getDocument(documentId: string, source = "local" as const) {
  const items =
    source === "local"
      ? useWorkspaceItemsStore.getState().localItems
      : useWorkspaceItemsStore.getState().cloudItems;

  return items.find(
    (item): item is WorkspaceDocumentItem =>
      isWorkspaceDocument(item) && item.id === documentId,
  );
}

function resetStore() {
  useWorkspaceItemsStore.getState().flushAllPendingContent();
  useWorkspaceItemsStore.setState({
    activeSource: "local",
    localItems: initialLocalItems.map((item) => ({ ...item })),
    cloudItems: initialCloudItems.map((item) => ({ ...item })),
    localCollapsedFolderIds: [],
    cloudCollapsedFolderIds: [],
    pendingContentByDocumentId: {},
    selectedDocumentId: "project-research",
  });
}

describe("workspace items store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
  });

  afterEach(() => {
    resetStore();
    vi.useRealTimers();
  });

  it("commits only the latest content after the debounce window", () => {
    const initialContent = getDocument("project-research")?.content;
    const expectedContent = normalizeMarkdownDocument("Final draft").content;

    useWorkspaceItemsStore
      .getState()
      .scheduleContentUpdate("project-research", "First draft");
    useWorkspaceItemsStore
      .getState()
      .scheduleContentUpdate("project-research", "Final draft");

    expect(getDocument("project-research")?.content).toBe(initialContent);
    expect(
      useWorkspaceItemsStore.getState().pendingContentByDocumentId[
        "project-research"
      ],
    ).toBe(expectedContent);

    vi.advanceTimersByTime(DOCUMENT_CONTENT_DEBOUNCE_MS - 1);
    expect(getDocument("project-research")?.content).toBe(initialContent);

    vi.advanceTimersByTime(1);
    expect(getDocument("project-research")?.content).toBe(expectedContent);
  });

  it("flushes pending content before clearing the selection", () => {
    const expectedContent = normalizeMarkdownDocument("Cleared draft").content;

    useWorkspaceItemsStore
      .getState()
      .scheduleContentUpdate("project-research", "Cleared draft");
    useWorkspaceItemsStore.getState().clearSelection();

    expect(useWorkspaceItemsStore.getState().selectedDocumentId).toBeNull();
    expect(getDocument("project-research")?.content).toBe(expectedContent);
  });

  it("keeps local Markdown unlimited and limits Cloud Markdown", () => {
    const localContent = `${"a".repeat(MAX_MARKDOWN_CHARACTERS)}b`;
    const expectedLocalContent = normalizeMarkdownDocument(
      localContent,
      Number.POSITIVE_INFINITY,
    ).content;
    useWorkspaceItemsStore
      .getState()
      .scheduleContentUpdate("project-research", localContent);
    expect(
      useWorkspaceItemsStore.getState().pendingContentByDocumentId[
        "project-research"
      ],
    ).toBe(expectedLocalContent);

    const cloudDocumentId = useWorkspaceItemsStore
      .getState()
      .createDocument("cloud", "Cloud document");
    useWorkspaceItemsStore.getState().setActiveSource("cloud");
    const cloudContent = `# Cloud document\n\n${"b".repeat(MAX_MARKDOWN_CHARACTERS)}`;

    useWorkspaceItemsStore
      .getState()
      .scheduleContentUpdate(cloudDocumentId, cloudContent);

    expect(
      useWorkspaceItemsStore.getState().pendingContentByDocumentId[
        cloudDocumentId
      ].length,
    ).toBe(MAX_MARKDOWN_CHARACTERS);
  });

  it("uses the first H1 as the document name", () => {
    const markdown = "\n\n# New title\n\nDocument content.";

    useWorkspaceItemsStore
      .getState()
      .scheduleContentUpdate("project-research", markdown);
    useWorkspaceItemsStore.getState().flushPendingContent("project-research");

    expect(getDocument("project-research")?.name).toBe("New title");
    expect(getDocument("project-research")?.content).toBe(
      "# New title\n\nDocument content.",
    );
  });

  it("creates a document directly under its parent folder", () => {
    const folderId = useWorkspaceItemsStore
      .getState()
      .localItems.find(
        (item) => isWorkspaceFolder(item) && item.name === "Notes",
      )?.id;

    expect(folderId).toBeDefined();
    const documentId = useWorkspaceItemsStore
      .getState()
      .createDocument("local", "Project plan", folderId);

    expect(getDocument(documentId)).toMatchObject({
      name: "Project plan",
      parent_id: folderId,
      content: "# Project plan\n\n",
    });
  });

  it("moves folders by changing only the moved item's parent", () => {
    const rootId = useWorkspaceItemsStore
      .getState()
      .localItems.find(
        (item) => isWorkspaceFolder(item) && item.parent_id === null,
      )?.id;
    const sourceId = useWorkspaceItemsStore
      .getState()
      .createFolder("local", "Move source", rootId);
    const destinationId = useWorkspaceItemsStore
      .getState()
      .createFolder("local", "Move destination", rootId);
    const childId = useWorkspaceItemsStore
      .getState()
      .createFolder("local", "Move child", sourceId);
    const documentId = useWorkspaceItemsStore
      .getState()
      .createDocument("local", "Move document", childId);

    expect(rootId).toBeDefined();
    expect(sourceId).not.toBeNull();
    expect(destinationId).not.toBeNull();
    expect(childId).not.toBeNull();
    expect(
      useWorkspaceItemsStore
        .getState()
        .moveFolder("local", sourceId!, destinationId!),
    ).toBe(true);

    const items = useWorkspaceItemsStore.getState().localItems;
    expect(items.find((item) => item.id === sourceId)?.parent_id).toBe(
      destinationId,
    );
    expect(items.find((item) => item.id === childId)?.parent_id).toBe(sourceId);
    expect(getDocument(documentId)?.parent_id).toBe(childId);
    expect(getWorkspaceRoute(items, documentId)).toContain("Move destination");
    expect(
      useWorkspaceItemsStore
        .getState()
        .moveFolder("local", destinationId!, childId!),
    ).toBe(false);
  });

  it("allows deep folders and rejects moving a folder into itself", () => {
    const rootId = useWorkspaceItemsStore
      .getState()
      .cloudItems.find(
        (item) => isWorkspaceFolder(item) && item.parent_id === null,
      )?.id;
    let parentId = rootId ?? null;

    for (let level = 1; level <= 21; level += 1) {
      parentId = useWorkspaceItemsStore
        .getState()
        .createFolder("cloud", `Level ${level}`, parentId);
    }

    expect(parentId).not.toBeNull();
    expect(
      useWorkspaceItemsStore
        .getState()
        .moveFolder("cloud", parentId!, parentId!),
    ).toBe(false);
  });

  it("marks deleted folders' documents without deleting unrelated items", () => {
    const rootId = useWorkspaceItemsStore
      .getState()
      .localItems.find(
        (item) => isWorkspaceFolder(item) && item.parent_id === null,
      )?.id;
    const folderId = useWorkspaceItemsStore
      .getState()
      .createFolder("local", "Disposable", rootId);
    const documentId = useWorkspaceItemsStore
      .getState()
      .createDocument("local", "Disposable document", folderId);

    expect(
      useWorkspaceItemsStore.getState().deleteFolder("local", folderId!),
    ).toBe(true);
    expect(getDocument(documentId)?.deleted_at).toBeTruthy();
    expect(getDocument("project-research")?.deleted_at).toBeFalsy();
  });

  it("keeps every seeded item unique and parented to an existing folder", () => {
    const items = LOCAL_WORKSPACE_ITEMS;
    const ids = items.map((item) => item.id);
    const folderIds = new Set(
      items.filter(isWorkspaceFolder).map((item) => item.id),
    );

    expect(new Set(ids).size).toBe(ids.length);
    items.forEach((item) => {
      expect(item.parent_id === null || folderIds.has(item.parent_id)).toBe(
        true,
      );
    });
    expect(CLOUD_WORKSPACE_ITEMS.some(isWorkspaceFolder)).toBe(true);
  });
});
