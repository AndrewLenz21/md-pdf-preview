import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CLOUD_WORKSPACE_ITEMS,
  LOCAL_WORKSPACE_ITEMS,
} from "@/modules/dashboard/constants/document-workspaces";
import type { WorkspaceDocumentItem } from "@/modules/dashboard/document/model/document.types";

import {
  mapCloudWorkspaceItem,
  useCloudWorkspaceStore,
} from "./cloud-workspace.store";
import { useLocalWorkspaceStore } from "./local-workspace.store";
import {
  DOCUMENT_CONTENT_DEBOUNCE_MS,
  MAX_MARKDOWN_CHARACTERS,
  getWorkspaceRoute,
  isWorkspaceDocument,
  isWorkspaceFolder,
  normalizeMarkdownDocument,
  normalizeWorkspaceItems,
} from "./workspace-items.store";

function getLocalDocument(documentId: string) {
  return useLocalWorkspaceStore
    .getState()
    .items.find(
      (item): item is WorkspaceDocumentItem =>
        isWorkspaceDocument(item) && item.id === documentId,
    );
}

function resetStores() {
  useLocalWorkspaceStore.getState().flushAllPendingContent();
  useCloudWorkspaceStore.getState().flushAllPendingContent();
  useLocalWorkspaceStore.setState({
    items: normalizeWorkspaceItems(LOCAL_WORKSPACE_ITEMS),
    pendingContentByDocumentId: {},
    collapsedFolderIds: [],
    isHydrated: true,
    isHydrating: false,
  });
  useCloudWorkspaceStore.setState({
    items: normalizeWorkspaceItems(CLOUD_WORKSPACE_ITEMS),
    pendingContentByDocumentId: {},
    collapsedFolderIds: [],
  });
}

describe("workspace item stores", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStores();
  });

  afterEach(() => {
    resetStores();
    vi.useRealTimers();
  });

  it("commits the latest local edit after the debounce window", () => {
    const initialContent = getLocalDocument("project-research")?.content;
    const expectedContent = normalizeMarkdownDocument(
      "Final draft",
      Number.POSITIVE_INFINITY,
    ).content;

    useLocalWorkspaceStore
      .getState()
      .scheduleContentUpdate("project-research", "First draft");
    useLocalWorkspaceStore
      .getState()
      .scheduleContentUpdate("project-research", "Final draft");

    expect(
      useLocalWorkspaceStore.getState().pendingContentByDocumentId[
        "project-research"
      ],
    ).toBe(expectedContent);

    vi.advanceTimersByTime(DOCUMENT_CONTENT_DEBOUNCE_MS - 1);
    expect(getLocalDocument("project-research")?.content).toBe(initialContent);

    vi.advanceTimersByTime(1);
    expect(getLocalDocument("project-research")?.content).toBe(expectedContent);
  });

  it("keeps local Markdown unlimited and limits Cloud Markdown", () => {
    const localContent = `${"a".repeat(MAX_MARKDOWN_CHARACTERS)}b`;
    useLocalWorkspaceStore
      .getState()
      .scheduleContentUpdate("project-research", localContent);

    expect(
      useLocalWorkspaceStore.getState().pendingContentByDocumentId[
        "project-research"
      ],
    ).toBe(
      normalizeMarkdownDocument(localContent, Number.POSITIVE_INFINITY).content,
    );

    const cloudDocumentId = useCloudWorkspaceStore
      .getState()
      .createDocument("Cloud document", "cloud-folder-root");
    useCloudWorkspaceStore
      .getState()
      .scheduleContentUpdate(
        cloudDocumentId,
        `# Cloud document\n\n${"b".repeat(MAX_MARKDOWN_CHARACTERS)}`,
      );

    expect(
      useCloudWorkspaceStore.getState().pendingContentByDocumentId[
        cloudDocumentId
      ].length,
    ).toBe(MAX_MARKDOWN_CHARACTERS);
  });

  it("moves a folder by changing only its parent_id", () => {
    const rootId = useLocalWorkspaceStore
      .getState()
      .items.find(
        (item) => isWorkspaceFolder(item) && item.parent_id === null,
      )?.id;
    const sourceId = useLocalWorkspaceStore
      .getState()
      .createFolder("Move source", rootId);
    const destinationId = useLocalWorkspaceStore
      .getState()
      .createFolder("Move destination", rootId);
    const childId = useLocalWorkspaceStore
      .getState()
      .createFolder("Move child", sourceId);
    const documentId = useLocalWorkspaceStore
      .getState()
      .createDocument("Move document", childId);

    expect(
      useLocalWorkspaceStore.getState().moveFolder(sourceId!, destinationId!),
    ).toBe(true);

    const items = useLocalWorkspaceStore.getState().items;
    expect(items.find((item) => item.id === sourceId)?.parent_id).toBe(
      destinationId,
    );
    expect(items.find((item) => item.id === childId)?.parent_id).toBe(sourceId);
    expect(getLocalDocument(documentId)?.parent_id).toBe(childId);
    expect(getWorkspaceRoute(items, documentId)).toContain("Move destination");
    expect(
      useLocalWorkspaceStore.getState().moveFolder(destinationId!, childId!),
    ).toBe(false);
    expect(
      useLocalWorkspaceStore.getState().moveFolder(sourceId!, null),
    ).toBe(true);
    expect(
      useLocalWorkspaceStore.getState().items.find(
        (item) => item.id === sourceId,
      )?.parent_id,
    ).toBeNull();
  });

  it("uses the first H1 as the document name", () => {
    useLocalWorkspaceStore
      .getState()
      .scheduleContentUpdate(
        "project-research",
        "\n\n# New title\n\nDocument content.",
      );
    useLocalWorkspaceStore.getState().flushPendingContent("project-research");

    expect(getLocalDocument("project-research")).toMatchObject({
      name: "New title",
      content: "# New title\n\nDocument content.",
    });
  });

  it("creates a document directly under its parent folder", () => {
    const folderId = useLocalWorkspaceStore
      .getState()
      .items.find(
        (item) => isWorkspaceFolder(item) && item.name === "Notes",
      )?.id;

    expect(folderId).toBeDefined();
    const documentId = useLocalWorkspaceStore
      .getState()
      .createDocument("Project plan", folderId);

    expect(getLocalDocument(documentId)).toMatchObject({
      name: "Project plan",
      parent_id: folderId,
      content: "# Project plan\n\n",
    });
  });

  it("stores and updates a folder's icon and color", () => {
    const rootId = useLocalWorkspaceStore
      .getState()
      .items.find(
        (item) => isWorkspaceFolder(item) && item.parent_id === null,
      )?.id;
    const folderId = useLocalWorkspaceStore
      .getState()
      .createFolder("Ideas", rootId, "violet", "lightbulb");

    expect(
      useLocalWorkspaceStore
        .getState()
        .items.find((item) => item.id === folderId),
    ).toMatchObject({ color: "violet", icon: "lightbulb" });

    useLocalWorkspaceStore
      .getState()
      .renameFolder(folderId!, "Goals", "amber", "target");

    expect(
      useLocalWorkspaceStore
        .getState()
        .items.find((item) => item.id === folderId),
    ).toMatchObject({ name: "Goals", color: "amber", icon: "target" });
  });

  it("allows deep folders and rejects moving a folder into itself", () => {
    const rootId = useCloudWorkspaceStore
      .getState()
      .items.find(
        (item) => isWorkspaceFolder(item) && item.parent_id === null,
      )?.id;
    let parentId = rootId ?? null;

    for (let level = 1; level <= 21; level += 1) {
      parentId = useCloudWorkspaceStore
        .getState()
        .createFolder(`Level ${level}`, parentId);
    }

    expect(parentId).not.toBeNull();
    expect(
      useCloudWorkspaceStore.getState().moveFolder(parentId!, parentId!),
    ).toBe(false);
  });

  it("marks a deleted folder's documents without deleting unrelated items", () => {
    const rootId = useLocalWorkspaceStore
      .getState()
      .items.find(
        (item) => isWorkspaceFolder(item) && item.parent_id === null,
      )?.id;
    const folderId = useLocalWorkspaceStore
      .getState()
      .createFolder("Disposable", rootId);
    const documentId = useLocalWorkspaceStore
      .getState()
      .createDocument("Disposable document", folderId);

    expect(useLocalWorkspaceStore.getState().deleteFolder(folderId!)).toBe(
      true,
    );
    expect(getLocalDocument(documentId)?.deleted_at).toBeTruthy();
    expect(getLocalDocument("project-research")?.deleted_at).toBeFalsy();
  });

  it("keeps seeded items unique and parented to an existing folder", () => {
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

  it("maps cloud camelCase metadata to client workspace fields", () => {
    expect(
      mapCloudWorkspaceItem({
        id: "cloud-document",
        parentId: "cloud-folder",
        type: "document",
        name: "Cloud document",
        color: null,
        icon: null,
        favorite: true,
        sortOrder: 3,
        contentRevision: 2,
        storageStatus: "ready",
        createdAt: "2026-08-23T00:00:00.000Z",
        updatedAt: "2026-08-23T00:01:00.000Z",
      }, "# Loaded\n"),
    ).toMatchObject({
      id: "cloud-document",
      parent_id: "cloud-folder",
      content: "# Loaded\n",
      favorite: true,
      content_revision: 2,
      storage_status: "ready",
    });
  });
});
