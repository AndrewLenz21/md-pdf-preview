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

  it("moves folders with their descendants and rejects cycles", () => {
    const store = useDocumentOrganizationStore.getState();
    const rootFolder = store.localFolders.find(
      (folder) => folder.parentId === null,
    );

    expect(rootFolder).toBeDefined();

    if (!rootFolder) {
      return;
    }

    const sourceFolder = store.createFolder(
      "local",
      "Move source",
      rootFolder.id,
    );
    const destinationFolder = store.createFolder(
      "local",
      "Move destination",
      rootFolder.id,
    );

    expect(sourceFolder).not.toBeNull();
    expect(destinationFolder).not.toBeNull();

    if (!sourceFolder || !destinationFolder) {
      return;
    }

    const childFolder = useDocumentOrganizationStore
      .getState()
      .createFolder("local", "Move child", sourceFolder);

    expect(childFolder).not.toBeNull();

    if (!childFolder) {
      return;
    }

    useDocumentOrganizationStore
      .getState()
      .moveDocument("local", "move-folder-test-document", childFolder);

    expect(
      useDocumentOrganizationStore
        .getState()
        .moveFolder("local", sourceFolder, destinationFolder),
    ).toBe(true);

    const nextState = useDocumentOrganizationStore.getState();
    expect(nextState.localFolders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: sourceFolder,
          parentId: destinationFolder,
          route: `/${rootFolder.id}/${destinationFolder}/${sourceFolder}`,
        }),
        expect.objectContaining({
          id: childFolder,
          parentId: sourceFolder,
          route: `/${rootFolder.id}/${destinationFolder}/${sourceFolder}/${childFolder}`,
        }),
      ]),
    );
    expect(nextState.localDocuments["move-folder-test-document"]).toMatchObject(
      {
        parentId: childFolder,
        route: `/${rootFolder.id}/${destinationFolder}/${sourceFolder}/${childFolder}/move-folder-test-document`,
      },
    );

    expect(nextState.moveFolder("local", destinationFolder, childFolder)).toBe(
      false,
    );
    expect(
      useDocumentOrganizationStore
        .getState()
        .localFolders.find((folder) => folder.id === destinationFolder)
        ?.parentId,
    ).toBe(rootFolder.id);
  });
});
