import { describe, expect, it } from "vitest";

import {
  CLOUD_WORKSPACE_ITEMS,
  LOCAL_WORKSPACE_ITEMS,
} from "@/modules/dashboard/constants/document-workspaces";
import type { WorkspaceItem } from "@/modules/dashboard/document/model/document.types";
import { isWorkspaceFolder } from "./workspace-items.store";
import {
  MAX_CLOUD_TRANSFER_ITEMS,
  copyWorkspaceItem,
  transferWorkspaceItem,
  validateCloudTransfer,
} from "./workspace-transfer";
import { MAX_MARKDOWN_CHARACTERS } from "./workspace-items.store";

describe("transferWorkspaceItem", () => {
  it("moves a document between workspaces without creating a copy", () => {
    const result = transferWorkspaceItem({
      itemId: "project-research",
      sourceItems: LOCAL_WORKSPACE_ITEMS,
      destinationItems: CLOUD_WORKSPACE_ITEMS,
      destinationParentId: "cloud-folder-root",
    });

    expect(
      result?.sourceItems.some((item) => item.id === "project-research"),
    ).toBe(false);
    expect(
      result?.destinationItems.find((item) => item.id === "project-research"),
    ).toMatchObject({ parent_id: "cloud-folder-root" });
  });

  it("moves a folder with every descendant while retaining internal parents", () => {
    const folderId = LOCAL_WORKSPACE_ITEMS.find(
      (item) => isWorkspaceFolder(item) && item.name === "Documents",
    )?.id;
    const result = transferWorkspaceItem({
      itemId: folderId ?? "",
      sourceItems: LOCAL_WORKSPACE_ITEMS,
      destinationItems: CLOUD_WORKSPACE_ITEMS,
      destinationParentId: "cloud-folder-root",
    });

    expect(result).not.toBeNull();
    expect(result?.sourceItems.some((item) => item.id === folderId)).toBe(
      false,
    );
    expect(
      result?.destinationItems.find((item) => item.id === folderId),
    ).toMatchObject({ parent_id: "cloud-folder-root" });
    expect(
      result?.destinationItems.find((item) => item.name === "Planning")
        ?.parent_id,
    ).toBe(folderId);
  });

  it("moves a document into an empty workspace root", () => {
    const result = transferWorkspaceItem({
      itemId: "project-research",
      sourceItems: LOCAL_WORKSPACE_ITEMS,
      destinationItems: [],
      destinationParentId: null,
    });

    expect(result).not.toBeNull();
    expect(result?.destinationItems).toHaveLength(1);
    expect(result?.destinationItems[0]).toMatchObject({
      id: "project-research",
      parent_id: null,
    });
  });

  it("allows a Cloud root document to move into a Session folder", () => {
    const cloudRootDocument = {
      id: "cloud-root-document",
      type: "document",
      parent_id: null,
      name: "Cloud root document",
      created_at: "2026-08-23T00:00:00.000Z",
      updated_at: "2026-08-23T00:00:00.000Z",
      content: "# Cloud root document\n\nContent",
      group: "documents",
    } satisfies WorkspaceItem;
    const destinationFolder = LOCAL_WORKSPACE_ITEMS.find(
      (item) => isWorkspaceFolder(item) && item.name === "Documents",
    );

    const result = transferWorkspaceItem({
      itemId: cloudRootDocument.id,
      sourceItems: [cloudRootDocument],
      destinationItems: LOCAL_WORKSPACE_ITEMS,
      destinationParentId: destinationFolder?.id ?? null,
    });

    expect(result?.destinationItems).toContainEqual(
      expect.objectContaining({
        id: cloudRootDocument.id,
        parent_id: destinationFolder?.id,
        content: cloudRootDocument.content,
      }),
    );
  });

  it("moves a folder and descendants into an empty workspace root", () => {
    const folderId = LOCAL_WORKSPACE_ITEMS.find(
      (item) => isWorkspaceFolder(item) && item.name === "Documents",
    )?.id;
    const result = transferWorkspaceItem({
      itemId: folderId ?? "",
      sourceItems: LOCAL_WORKSPACE_ITEMS,
      destinationItems: [],
      destinationParentId: null,
    });

    expect(result).not.toBeNull();
    expect(
      result?.destinationItems.find((item) => item.id === folderId),
    ).toMatchObject({ parent_id: null });
    expect(
      result?.destinationItems.find((item) => item.name === "Planning"),
    ).toMatchObject({ parent_id: folderId });
  });

  it("rejects an attempt to move a workspace root", () => {
    const rootId = LOCAL_WORKSPACE_ITEMS.find(
      (item) => isWorkspaceFolder(item) && item.parent_id === null,
    )?.id;

    expect(
      transferWorkspaceItem({
        itemId: rootId ?? "",
        sourceItems: LOCAL_WORKSPACE_ITEMS,
        destinationItems: CLOUD_WORKSPACE_ITEMS,
        destinationParentId: "cloud-folder-root",
      }),
    ).toBeNull();
  });
});

describe("copyWorkspaceItem", () => {
  it("copies a document into a folder while retaining the source", () => {
    const destinationFolder = LOCAL_WORKSPACE_ITEMS.find(
      (item) => isWorkspaceFolder(item) && item.name === "Documents",
    );
    const result = copyWorkspaceItem(
      LOCAL_WORKSPACE_ITEMS,
      LOCAL_WORKSPACE_ITEMS,
      "project-research",
      destinationFolder?.id ?? null,
    );

    expect(result).not.toBeNull();
    expect(result?.items).toHaveLength(LOCAL_WORKSPACE_ITEMS.length + 1);
    expect(result?.items).toContainEqual(
      expect.objectContaining({
        id: "project-research",
        parent_id: "local-folder-working-set",
      }),
    );
    expect(result?.copiedItemId).not.toBe("project-research");
    expect(result?.items).toContainEqual(
      expect.objectContaining({
        id: result?.copiedItemId,
        parent_id: destinationFolder?.id,
        content: expect.any(String),
      }),
    );
  });

  it("copies a folder with descendants and remaps every internal parent", () => {
    const folderId = LOCAL_WORKSPACE_ITEMS.find(
      (item) => isWorkspaceFolder(item) && item.name === "Documents",
    )?.id;
    const destinationFolder = LOCAL_WORKSPACE_ITEMS.find(
      (item) => isWorkspaceFolder(item) && item.name === "Recents",
    );
    const result = copyWorkspaceItem(
      LOCAL_WORKSPACE_ITEMS,
      LOCAL_WORKSPACE_ITEMS,
      folderId ?? "",
      destinationFolder?.id ?? null,
    );

    expect(result).not.toBeNull();
    expect(result?.items.length).toBeGreaterThan(LOCAL_WORKSPACE_ITEMS.length);
    expect(result?.items).toContainEqual(
      expect.objectContaining({
        id: result?.copiedItemId,
        parent_id: destinationFolder?.id,
        type: "folder",
      }),
    );

    const copiedChild = result?.items.find(
      (item) =>
        item.name === "Planning" && item.id !== "local-folder-planning",
    );
    expect(copiedChild?.parent_id).toBe(result?.copiedItemId);
  });
});

describe("validateCloudTransfer", () => {
  it("blocks a folder with more than the Cloud item limit", () => {
    const folder = {
      id: "large-folder",
      type: "folder",
      parent_id: null,
      name: "Large folder",
      created_at: "2026-08-23T00:00:00.000Z",
      updated_at: "2026-08-23T00:00:00.000Z",
      color: "primary",
      icon: "folder",
    } satisfies WorkspaceItem;
    const items: WorkspaceItem[] = [
      folder,
      ...Array.from({ length: MAX_CLOUD_TRANSFER_ITEMS + 1 }, (_, index) => ({
        id: `document-${index}`,
        type: "document",
        parent_id: folder.id,
        name: `Document ${index}`,
        created_at: "2026-08-23T00:00:00.000Z",
        updated_at: "2026-08-23T00:00:00.000Z",
        content: "# Document",
        group: "documents",
      } satisfies WorkspaceItem)),
    ];

    const result = validateCloudTransfer(items, folder.id);

    expect(result).toMatchObject({ valid: false });
    expect(result).toMatchObject({
      message: expect.stringContaining("Large folder"),
    });
  });

  it("names the document that exceeds the Cloud character limit", () => {
    const document = {
      id: "oversized-document",
      type: "document",
      parent_id: null,
      name: "Oversized notes",
      created_at: "2026-08-23T00:00:00.000Z",
      updated_at: "2026-08-23T00:00:00.000Z",
      content: "x".repeat(MAX_MARKDOWN_CHARACTERS + 1),
      group: "documents",
    } satisfies WorkspaceItem;

    const result = validateCloudTransfer([document], document.id);

    expect(result).toMatchObject({ valid: false });
    expect(result).toMatchObject({
      message: expect.stringContaining("Oversized notes"),
    });
  });
});
