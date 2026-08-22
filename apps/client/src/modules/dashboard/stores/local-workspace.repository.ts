import {
  DEFAULT_DOCUMENT_FOLDER_COLOR,
  DEFAULT_DOCUMENT_FOLDER_ICON,
  type WorkspaceItem,
} from "@/modules/dashboard/document/model/document.types";

const DATABASE_NAME = "md-pdf-preview";
const DATABASE_VERSION = 2;
const ITEMS_STORE = "workspace-items";
const META_STORE = "workspace-meta";
const INITIALIZED_KEY = "local-workspace-initialized";

let writeQueue = Promise.resolve();

function cloneItems(items: WorkspaceItem[]) {
  return items.map((item) => ({ ...item }));
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

function migrateWorkspaceItems(store: IDBObjectStore) {
  const request = store.openCursor();

  request.onsuccess = () => {
    const cursor = request.result;

    if (!cursor) {
      return;
    }

    const item = cursor.value as Record<string, unknown>;

    if (item.type === "folder") {
      cursor.update({
        ...item,
        color: item.color ?? DEFAULT_DOCUMENT_FOLDER_COLOR,
        icon: item.icon ?? DEFAULT_DOCUMENT_FOLDER_ICON,
      });
    }

    cursor.continue();
  };
}

function openLocalWorkspaceDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      const items = database.objectStoreNames.contains(ITEMS_STORE)
        ? request.transaction?.objectStore(ITEMS_STORE)
        : database.createObjectStore(ITEMS_STORE, { keyPath: "id" });

      if (!items) {
        reject(new Error("Unable to open the workspace items store."));
        return;
      }

      if (!items.indexNames.contains("parent_id")) {
        items.createIndex("parent_id", "parent_id", { unique: false });
      }
      if (!items.indexNames.contains("type")) {
        items.createIndex("type", "type", { unique: false });
      }

      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: "key" });
      }

      migrateWorkspaceItems(items);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadLocalWorkspaceItems(seedItems: WorkspaceItem[]) {
  if (typeof indexedDB === "undefined") {
    return cloneItems(seedItems);
  }

  const database = await openLocalWorkspaceDatabase();

  try {
    const transaction = database.transaction(
      [ITEMS_STORE, META_STORE],
      "readwrite",
    );
    const done = transactionDone(transaction);
    const itemsStore = transaction.objectStore(ITEMS_STORE);
    const metaStore = transaction.objectStore(META_STORE);
    const initialized = await requestResult(metaStore.get(INITIALIZED_KEY));
    let items = await requestResult(itemsStore.getAll());

    if (!initialized) {
      const seededItems = cloneItems(seedItems);
      seededItems.forEach((item) => itemsStore.put(item));
      metaStore.put({ key: INITIALIZED_KEY, value: true });
      items = seededItems;
    }

    await done;
    return items as WorkspaceItem[];
  } finally {
    database.close();
  }
}

async function persistLocalWorkspaceChanges(
  previousItems: WorkspaceItem[],
  nextItems: WorkspaceItem[],
) {
  if (typeof indexedDB === "undefined") {
    return;
  }

  const previousById = new Map(previousItems.map((item) => [item.id, item]));
  const nextById = new Map(nextItems.map((item) => [item.id, item]));
  const database = await openLocalWorkspaceDatabase();

  try {
    const transaction = database.transaction(ITEMS_STORE, "readwrite");
    const done = transactionDone(transaction);
    const store = transaction.objectStore(ITEMS_STORE);

    previousById.forEach((_, id) => {
      if (!nextById.has(id)) {
        store.delete(id);
      }
    });
    nextById.forEach((item, id) => {
      if (JSON.stringify(previousById.get(id)) !== JSON.stringify(item)) {
        store.put(item);
      }
    });

    await done;
  } finally {
    database.close();
  }
}

export function queueLocalWorkspaceChanges(
  previousItems: WorkspaceItem[],
  nextItems: WorkspaceItem[],
) {
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(() => persistLocalWorkspaceChanges(previousItems, nextItems));

  return writeQueue;
}
