import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { WorkspaceItem } from "@/modules/dashboard/document/model/document.types";

import {
  loadLocalWorkspaceItems,
  queueLocalWorkspaceChanges,
} from "./local-workspace.repository";

const databaseName = "md-pdf-preview";

const seedItems: WorkspaceItem[] = [
  {
    id: "a-root",
    type: "folder",
    parent_id: null,
    name: "Session",
    color: "primary",
    icon: "folder",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "b-document",
    type: "document",
    parent_id: "a-root",
    name: "Draft",
    group: "documents",
    content: "# Draft",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

function deleteDatabase() {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("The IndexedDB database is blocked."));
  });
}

function createLegacyDatabase() {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      const items = database.createObjectStore("workspace-items", {
        keyPath: "id",
      });
      items.createIndex("parent_id", "parent_id", { unique: false });
      items.createIndex("type", "type", { unique: false });
      const meta = database.createObjectStore("workspace-meta", {
        keyPath: "key",
      });

      items.put({
        id: "legacy-root",
        type: "folder",
        parent_id: null,
        name: "Legacy workspace",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      });
      meta.put({ key: "local-workspace-initialized", value: true });
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

describe("local workspace repository", () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  afterEach(async () => {
    await deleteDatabase();
  });

  it("seeds IndexedDB only during its first initialization", async () => {
    expect(await loadLocalWorkspaceItems(seedItems)).toEqual(seedItems);

    expect(await loadLocalWorkspaceItems([])).toEqual(seedItems);
  });

  it("persists changed and deleted items between loads", async () => {
    await loadLocalWorkspaceItems(seedItems);

    const nextItems: WorkspaceItem[] = [
      {
        ...seedItems[0],
        name: "Renamed session",
        updated_at: "2026-01-02T00:00:00.000Z",
      },
    ];

    await queueLocalWorkspaceChanges(seedItems, nextItems);

    expect(await loadLocalWorkspaceItems([])).toEqual(nextItems);
  });

  it("upgrades legacy folders with icon and color defaults", async () => {
    await createLegacyDatabase();

    expect(await loadLocalWorkspaceItems([])).toEqual([
      expect.objectContaining({
        id: "legacy-root",
        color: "primary",
        icon: "folder",
      }),
    ]);
  });
});
