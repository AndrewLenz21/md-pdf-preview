import { describe, expect, it } from "vitest";

import { useDocumentOrganizationStore } from "./document-organization.store";

describe("document organization store", () => {
  it("allows duplicate names while keeping parent IDs and routes separate", () => {
    const rootFolder = useDocumentOrganizationStore
      .getState()
      .cloudFolders.find((folder) => folder.parentId === null);

    expect(rootFolder).toBeDefined();

    if (!rootFolder) {
      return;
    }

    const firstFolderId = useDocumentOrganizationStore
      .getState()
      .createFolder("cloud", "Shared", rootFolder.id);
    const secondFolderId = useDocumentOrganizationStore
      .getState()
      .createFolder("cloud", "Shared", rootFolder.id);

    expect(firstFolderId).not.toBeNull();
    expect(secondFolderId).not.toBeNull();
    expect(firstFolderId).not.toBe(secondFolderId);

    const folders = useDocumentOrganizationStore.getState().cloudFolders;
    const firstFolder = folders.find((folder) => folder.id === firstFolderId);
    const secondFolder = folders.find((folder) => folder.id === secondFolderId);

    expect(firstFolder).toMatchObject({
      name: "Shared",
      parentId: rootFolder.id,
      route: `/${rootFolder.id}/${firstFolderId}`,
    });
    expect(secondFolder).toMatchObject({
      name: "Shared",
      parentId: rootFolder.id,
      route: `/${rootFolder.id}/${secondFolderId}`,
    });

    useDocumentOrganizationStore
      .getState()
      .moveDocument("cloud", "cloud-document-test", firstFolderId);

    expect(
      useDocumentOrganizationStore.getState().cloudDocuments[
        "cloud-document-test"
      ],
    ).toMatchObject({
      parentId: firstFolderId,
      route: `/${rootFolder.id}/${firstFolderId}/cloud-document-test`,
    });
  });

  it("allows folders beyond the previous depth limit", () => {
    let parentId: string | null = null;

    for (let level = 1; level <= 21; level += 1) {
      parentId = useDocumentOrganizationStore
        .getState()
        .createFolder("cloud", `Level ${level}`, parentId);

      expect(parentId).not.toBeNull();
    }
  });
});
