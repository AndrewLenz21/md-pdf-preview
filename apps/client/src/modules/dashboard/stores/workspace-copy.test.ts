import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WorkspaceApiItem } from "../services/workspace-api";
import type { WorkspaceItem } from "@/modules/dashboard/document/model/document.types";
import {
  mapCloudWorkspaceItem,
  useCloudWorkspaceStore,
} from "./cloud-workspace.store";
import { useLocalWorkspaceStore } from "./local-workspace.store";
import { useWorkspaceSessionStore } from "./workspace-session.store";
import {
  MAX_CLOUD_TRANSFER_ITEMS,
  copyWorkspaceItemBetweenSources,
  transferWorkspaceItemBetweenSources,
} from "./workspace-transfer";

const { workspaceApi, downloadWorkspaceDocument, uploadWorkspaceDocument } =
  vi.hoisted(() => ({
    workspaceApi: {
      createItem: vi.fn(),
      deleteItem: vi.fn(),
    },
    downloadWorkspaceDocument: vi.fn(),
    uploadWorkspaceDocument: vi.fn(),
  }));

vi.mock("../services/workspace-api", () => ({
  WorkspaceApiError: class WorkspaceApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  downloadWorkspaceDocument,
  toWorkspaceApiError: (error: unknown) =>
    error instanceof Error ? error : new Error("Workspace request failed."),
  uploadWorkspaceDocument,
  workspaceApi,
}));

function createApiItem(overrides: Partial<WorkspaceApiItem> = {}) {
  return {
    id: "item-id",
    parentId: null,
    type: "document",
    name: "Item",
    color: null,
    icon: null,
    favorite: false,
    sortOrder: 0,
    contentRevision: 1,
    storageStatus: "ready",
    createdAt: "2026-08-23T00:00:00.000Z",
    updatedAt: "2026-08-23T00:00:00.000Z",
    ...overrides,
  } satisfies WorkspaceApiItem;
}

beforeEach(() => {
  vi.clearAllMocks();
  useCloudWorkspaceStore.setState({
    items: [],
    isHydrated: false,
    isHydrating: false,
    operation: null,
    error: null,
    pendingContentByDocumentId: {},
    contentLoadedByDocumentId: {},
    contentLoadingByDocumentId: {},
    contentErrorByDocumentId: {},
  });
  useLocalWorkspaceStore.setState({ items: [] });
  useWorkspaceSessionStore.setState({
    activeSource: "local",
    workspaceTransfer: null,
  });
});

describe("copyWorkspaceItemBetweenSources", () => {
  it("copies a Cloud folder subtree through the API without deleting the source", async () => {
    const sourceFolder = createApiItem({
      id: "source-folder",
      type: "folder",
      name: "Source",
      color: "blue",
      icon: "folder",
    });
    const sourceDocument = createApiItem({
      id: "source-document",
      parentId: "source-folder",
      name: "Notes",
    });
    const destinationFolder = createApiItem({
      id: "destination-folder",
      type: "folder",
      name: "Destination",
      color: "primary",
      icon: "folder",
    });
    const sourceItems = [
      mapCloudWorkspaceItem(sourceFolder),
      mapCloudWorkspaceItem(sourceDocument, "# Notes"),
    ];

    useCloudWorkspaceStore.setState({
      items: [...sourceItems, mapCloudWorkspaceItem(destinationFolder)],
      isHydrated: true,
      contentLoadedByDocumentId: { "source-document": true },
    });
    workspaceApi.createItem
      .mockResolvedValueOnce(
        createApiItem({
          id: "copied-folder",
          parentId: "destination-folder",
          type: "folder",
          name: "Source",
          color: "blue",
          icon: "folder",
        }),
      )
      .mockResolvedValueOnce(
        createApiItem({
          id: "copied-document",
          parentId: "copied-folder",
          name: "Notes",
        }),
      );
    uploadWorkspaceDocument.mockImplementation(async (document) =>
      createApiItem({
        id: document.id,
        parentId: "copied-folder",
        name: document.name,
      }),
    );

    const copiedId = await copyWorkspaceItemBetweenSources({
      itemId: "source-folder",
      source: "cloud",
      destination: "cloud",
      destinationParentId: "destination-folder",
    });

    expect(copiedId).toBe("copied-folder");
    expect(workspaceApi.createItem).toHaveBeenCalledTimes(2);
    expect(uploadWorkspaceDocument).toHaveBeenCalledWith(
      expect.objectContaining({ id: "copied-document" }),
      "# Notes",
    );
    expect(workspaceApi.deleteItem).not.toHaveBeenCalled();
    expect(useCloudWorkspaceStore.getState().items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "source-folder" }),
        expect.objectContaining({ id: "source-document" }),
        expect.objectContaining({
          id: "copied-folder",
          parent_id: "destination-folder",
        }),
        expect.objectContaining({
          id: "copied-document",
          parent_id: "copied-folder",
          content: "# Notes",
        }),
      ]),
    );
  });

  it("copies Cloud content into Session while keeping the Cloud item", async () => {
    const sourceDocument = mapCloudWorkspaceItem(
      createApiItem({
        id: "cloud-document",
        name: "Cloud notes",
      }),
    );
    const destinationFolder = mapCloudWorkspaceItem(
      createApiItem({
        id: "cloud-folder",
        type: "folder",
        name: "Cloud folder",
        color: "primary",
        icon: "folder",
      }),
    );
    const sessionFolder = {
      ...destinationFolder,
      id: "session-folder",
      name: "Session folder",
    };

    useCloudWorkspaceStore.setState({
      items: [sourceDocument, destinationFolder],
      isHydrated: true,
      contentLoadedByDocumentId: { "cloud-document": true },
    });
    useLocalWorkspaceStore.setState({ items: [sessionFolder] });
    const sourceWithContent = { ...sourceDocument, content: "# Cloud notes" };
    useCloudWorkspaceStore.setState({ items: [sourceWithContent, destinationFolder] });

    const copiedId = await copyWorkspaceItemBetweenSources({
      itemId: "cloud-document",
      source: "cloud",
      destination: "local",
      destinationParentId: "session-folder",
    });

    const copiedDocument = useLocalWorkspaceStore
      .getState()
      .items.find((item) => item.id === copiedId);
    expect(copiedId).not.toBe("cloud-document");
    expect(copiedDocument).toMatchObject({
      parent_id: "session-folder",
      content: "# Cloud notes",
    });
    expect(useCloudWorkspaceStore.getState().items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "cloud-document" })]),
    );
    expect(workspaceApi.deleteItem).not.toHaveBeenCalled();
  });

  it("blocks a Cloud paste and exposes the reason when the folder is too large", async () => {
    const folder = {
      id: "large-session-folder",
      type: "folder",
      parent_id: null,
      name: "Large session folder",
      created_at: "2026-08-23T00:00:00.000Z",
      updated_at: "2026-08-23T00:00:00.000Z",
      color: "primary",
      icon: "folder",
    } satisfies WorkspaceItem;
    const items: WorkspaceItem[] = [
      folder,
      ...Array.from({ length: MAX_CLOUD_TRANSFER_ITEMS + 1 }, (_, index) => ({
        id: `session-document-${index}`,
        type: "document",
        parent_id: folder.id,
        name: `Session document ${index}`,
        created_at: "2026-08-23T00:00:00.000Z",
        updated_at: "2026-08-23T00:00:00.000Z",
        content: "# Session document",
        group: "documents",
      } satisfies WorkspaceItem)),
    ];

    useLocalWorkspaceStore.setState({ items });
    useCloudWorkspaceStore.setState({ isHydrated: true, items: [] });

    const result = await copyWorkspaceItemBetweenSources({
      itemId: folder.id,
      source: "local",
      destination: "cloud",
      destinationParentId: null,
    });

    expect(result).toBe(false);
    expect(workspaceApi.createItem).not.toHaveBeenCalled();
    expect(useCloudWorkspaceStore.getState().error?.message).toContain(
      "Large session folder",
    );
  });

  it("blocks a Cloud drag transfer when a document exceeds the limit", async () => {
    const document = {
      id: "large-session-document",
      type: "document",
      parent_id: null,
      name: "Large session document",
      created_at: "2026-08-23T00:00:00.000Z",
      updated_at: "2026-08-23T00:00:00.000Z",
      content: `${"x".repeat(20_000)}x`,
      group: "documents",
    } satisfies WorkspaceItem;

    useLocalWorkspaceStore.setState({ items: [document] });
    useCloudWorkspaceStore.setState({ isHydrated: true, items: [] });

    const result = await transferWorkspaceItemBetweenSources({
      itemId: document.id,
      source: "local",
      destination: "cloud",
      destinationParentId: null,
    });

    expect(result).toBe(false);
    expect(workspaceApi.createItem).not.toHaveBeenCalled();
    expect(useCloudWorkspaceStore.getState().error?.message).toContain(
      "Large session document",
    );
    expect(useWorkspaceSessionStore.getState()).toMatchObject({
      activeSource: "local",
      workspaceTransfer: null,
    });
  });
});
