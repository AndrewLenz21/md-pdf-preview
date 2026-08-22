import { describe, expect, it } from "vitest";

import {
  CLOUD_WORKSPACE_ITEMS,
  LOCAL_WORKSPACE_ITEMS,
} from "@/modules/dashboard/constants/document-workspaces";
import { isWorkspaceFolder } from "./workspace-items.store";
import { transferWorkspaceItem } from "./workspace-transfer";

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
