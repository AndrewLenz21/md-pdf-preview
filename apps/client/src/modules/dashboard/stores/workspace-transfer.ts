import type { WorkspaceItem } from "@/modules/dashboard/document/model/document.types";
import {
  MAX_MARKDOWN_CHARACTERS,
  createWorkspaceItemId,
  isWorkspaceDocument,
  isWorkspaceFolder,
} from "./workspace-items.store";
import { useCloudWorkspaceStore } from "./cloud-workspace.store";
import { useLocalWorkspaceStore } from "./local-workspace.store";
import { persistLocalWorkspaceItems } from "./local-workspace.repository";
import {
  mapCloudWorkspaceItem,
  type CloudWorkspaceOperation,
} from "./cloud-workspace.store";
import {
  toWorkspaceApiError,
  uploadWorkspaceDocument,
  workspaceApi,
} from "../services/workspace-api";

type WorkspaceTransferResult = {
  sourceItems: WorkspaceItem[];
  destinationItems: WorkspaceItem[];
};

export const MAX_CLOUD_TRANSFER_ITEMS = 15;

export type CloudTransferValidation =
  | { valid: true }
  | { valid: false; message: string };

function getFolderSubtreeIds(items: WorkspaceItem[], folderId: string) {
  const folderIds = new Set<string>();
  const collect = (currentId: string) => {
    folderIds.add(currentId);
    items
      .filter((item) => isWorkspaceFolder(item) && item.parent_id === currentId)
      .forEach((item) => collect(item.id));
  };

  collect(folderId);
  return folderIds;
}

function getTransferredItems(items: WorkspaceItem[], itemId: string) {
  const item = items.find((candidate) => candidate.id === itemId);
  if (!item) {
    return null;
  }

  const transferredIds = isWorkspaceFolder(item)
    ? getFolderSubtreeIds(items, item.id)
    : new Set([item.id]);

  return items.filter(
    (candidate) =>
      transferredIds.has(candidate.id) ||
      (isWorkspaceDocument(candidate) &&
        candidate.parent_id !== null &&
        transferredIds.has(candidate.parent_id)),
  );
}

export function validateCloudTransfer(
  items: WorkspaceItem[],
  itemId: string,
): CloudTransferValidation {
  const sourceItem = items.find((item) => item.id === itemId);
  const transferredItems = getTransferredItems(items, itemId);

  if (!sourceItem || !transferredItems) {
    return {
      valid: false,
      message:
        "Cloud transfer blocked: the workspace item is no longer available.",
    };
  }

  const containedItemCount = isWorkspaceFolder(sourceItem)
    ? transferredItems.length - 1
    : 1;
  const oversizedDocument = transferredItems.find(
    (item) =>
      isWorkspaceDocument(item) &&
      item.content.length > MAX_MARKDOWN_CHARACTERS,
  );
  const messages: string[] = [];

  if (containedItemCount > MAX_CLOUD_TRANSFER_ITEMS) {
    messages.push(
      `"${sourceItem.name}" contains ${containedItemCount} items. Cloud transfers support at most ${MAX_CLOUD_TRANSFER_ITEMS} items.`,
    );
  }

  if (oversizedDocument && isWorkspaceDocument(oversizedDocument)) {
    messages.push(
      `"${oversizedDocument.name}" has ${oversizedDocument.content.length.toLocaleString()} characters. Cloud files are limited to ${MAX_MARKDOWN_CHARACTERS.toLocaleString()} characters.`,
    );
  }

  return messages.length > 0
    ? {
        valid: false,
        message: `Cloud transfer blocked: ${messages.join(" ")}`,
      }
    : { valid: true };
}

export function transferWorkspaceItem({
  itemId,
  sourceItems,
  destinationItems,
  destinationParentId,
}: {
  itemId: string;
  sourceItems: WorkspaceItem[];
  destinationItems: WorkspaceItem[];
  destinationParentId: string | null;
}): WorkspaceTransferResult | null {
  const item = sourceItems.find((candidate) => candidate.id === itemId);
  const destinationParent = destinationItems.find(
    (candidate) =>
      isWorkspaceFolder(candidate) && candidate.id === destinationParentId,
  );

  if (
    !item ||
    (isWorkspaceFolder(item) && item.parent_id === null) ||
    (destinationParentId !== null && !destinationParent)
  ) {
    return null;
  }

  const transferredIds = isWorkspaceFolder(item)
    ? getFolderSubtreeIds(sourceItems, item.id)
    : new Set([item.id]);
  const transferredItems = sourceItems.filter(
    (candidate) =>
      transferredIds.has(candidate.id) ||
      (isWorkspaceDocument(candidate) &&
        candidate.parent_id !== null &&
        transferredIds.has(candidate.parent_id)),
  );

  if (
    transferredItems.some((candidate) =>
      destinationItems.some((existing) => existing.id === candidate.id),
    )
  ) {
    return null;
  }

  const timestamp = new Date().toISOString();
  return {
    sourceItems: sourceItems.filter(
      (candidate) => !transferredItems.some((item) => item.id === candidate.id),
    ),
    destinationItems: [
      ...destinationItems,
      ...transferredItems.map((candidate) =>
        candidate.id === itemId
          ? {
              ...candidate,
              parent_id: destinationParentId,
              updated_at: timestamp,
            }
          : candidate,
      ),
    ],
  };
}

function remapLocalItems(
  items: WorkspaceItem[],
  itemId: string,
  destinationParentId: string | null,
) {
  const sourceItem = items.find((item) => item.id === itemId);
  const transferredItems = getTransferredItems(items, itemId);

  if (!sourceItem || !transferredItems) {
    return null;
  }

  const idMap = new Map<string, string>();
  transferredItems.forEach((item) => {
    idMap.set(
      item.id,
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local-transfer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
  });

  return {
    items: transferredItems.map((item) => ({
      ...item,
      id: idMap.get(item.id) ?? item.id,
      parent_id:
        item.id === itemId
          ? destinationParentId
          : item.parent_id === null
            ? null
            : idMap.get(item.parent_id) ?? item.parent_id,
    })),
    transferredItemId: idMap.get(itemId) ?? null,
  };
}

function getFolderDepth(items: WorkspaceItem[], item: WorkspaceItem) {
  let depth = 0;
  let parentId = item.parent_id;

  while (parentId) {
    depth += 1;
    parentId = items.find((candidate) => candidate.id === parentId)?.parent_id ?? null;
  }

  return depth;
}

export function copyWorkspaceItem(
  sourceItems: WorkspaceItem[],
  destinationItems: WorkspaceItem[],
  itemId: string,
  destinationParentId: string | null,
) {
  const sourceItem = sourceItems.find((item) => item.id === itemId);
  const copiedItems = getTransferredItems(sourceItems, itemId);
  const destinationFolder = destinationItems.find(
    (item) =>
      isWorkspaceFolder(item) && item.id === destinationParentId,
  );

  if (
    !sourceItem ||
    !copiedItems ||
    (destinationParentId !== null && !destinationFolder)
  ) {
    return null;
  }

  const idMap = new Map<string, string>();
  copiedItems.forEach((item) => {
    idMap.set(item.id, createWorkspaceItemId("copy"));
  });

  const timestamp = new Date().toISOString();
  const clonedItems = copiedItems.map((item) => ({
    ...item,
    id: idMap.get(item.id) ?? item.id,
    parent_id:
      item.id === itemId
        ? destinationParentId
        : item.parent_id === null
          ? null
          : idMap.get(item.parent_id) ?? item.parent_id,
    created_at: timestamp,
    updated_at: timestamp,
    ...(isWorkspaceDocument(item) ? { deleted_at: null } : {}),
  }));

  return {
    items: [...destinationItems, ...clonedItems],
    copiedItemId: idMap.get(itemId) ?? null,
  };
}

function setCloudTransferOperation(operation: CloudWorkspaceOperation | null) {
  useCloudWorkspaceStore.getState().setCloudOperation(operation);
}

function setCloudTransferValidationError(message: string) {
  useCloudWorkspaceStore
    .getState()
    .setCloudError(toWorkspaceApiError(new Error(message)));
}

export async function transferWorkspaceItemBetweenSources({
  itemId,
  source,
  destination,
  destinationParentId,
}: {
  itemId: string;
  source: "local" | "cloud";
  destination: "local" | "cloud";
  destinationParentId: string | null;
}) {
  const cloudState = useCloudWorkspaceStore.getState();

  if (
    source === destination ||
    cloudState.operation !== null ||
    cloudState.isHydrating
  ) {
    return false;
  }

  setCloudTransferOperation("transfer");
  cloudState.setCloudError(null);

  try {
    if (source === "cloud" && destination === "local") {
      await cloudState.flushAllPendingContentAndSave();

      const sourceItems = useCloudWorkspaceStore.getState().items;
      const sourceDocuments = (getTransferredItems(sourceItems, itemId) ?? []).filter(
        isWorkspaceDocument,
      );
      await Promise.all(
        sourceDocuments.map((document) =>
          useCloudWorkspaceStore.getState().loadDocumentContent(document.id),
        ),
      );

      const loadedSourceItems = useCloudWorkspaceStore.getState().items;
      const destinationItems = useLocalWorkspaceStore.getState().items;
      const mappedItems = remapLocalItems(
        loadedSourceItems,
        itemId,
        destinationParentId,
      );

      if (!mappedItems) {
        return false;
      }

      const nextLocalItems = [...destinationItems, ...mappedItems.items];
      await persistLocalWorkspaceItems(nextLocalItems);
      useLocalWorkspaceStore.getState().setItems(nextLocalItems);

      await workspaceApi.deleteItem(itemId);
      useCloudWorkspaceStore
        .getState()
        .setItems(
          loadedSourceItems.filter(
            (item) => !getTransferredItems(loadedSourceItems, itemId)?.some(
              (transferredItem) => transferredItem.id === item.id,
            ),
          ),
        );
      return mappedItems.transferredItemId ?? false;
    }

    const initialSourceItems = useLocalWorkspaceStore.getState().items;
    const destinationItems = useCloudWorkspaceStore.getState().items;
    const initialSourceItem = initialSourceItems.find(
      (item) => item.id === itemId,
    );
    const destinationFolder =
      destinationParentId === null
        ? null
        : destinationItems.find(
            (item) =>
              isWorkspaceFolder(item) && item.id === destinationParentId,
          );

    if (
      !getTransferredItems(initialSourceItems, itemId) ||
      !initialSourceItem ||
      (isWorkspaceFolder(initialSourceItem) &&
        initialSourceItem.parent_id === null) ||
      (destinationParentId !== null && !destinationFolder)
    ) {
      return false;
    }

    await useLocalWorkspaceStore.getState().flushAllPendingContent();
    const sourceItems = useLocalWorkspaceStore.getState().items;
    const transferredItems = getTransferredItems(sourceItems, itemId);

    if (!transferredItems) {
      return false;
    }

    const validation = validateCloudTransfer(sourceItems, itemId);
    if (!validation.valid) {
      setCloudTransferValidationError(validation.message);
      return false;
    }

    await persistLocalWorkspaceItems(sourceItems);

    const createdItems: WorkspaceItem[] = [];
    const remoteIds = new Map<string, string>();
    let remoteRootId: string | null = null;
    const createOrder = [...transferredItems].sort((left, right) => {
      if (isWorkspaceFolder(left) !== isWorkspaceFolder(right)) {
        return isWorkspaceFolder(left) ? -1 : 1;
      }

      return getFolderDepth(transferredItems, left) - getFolderDepth(
        transferredItems,
        right,
      );
    });

    try {
      for (const item of createOrder) {
        const parentId =
          item.id === itemId
            ? destinationParentId
            : item.parent_id
              ? (remoteIds.get(item.parent_id) ?? null)
              : null;

        if (item.id !== itemId && !parentId) {
          throw new Error("Unable to resolve the transferred workspace parent.");
        }

        const created = await workspaceApi.createItem({
          parentId,
          name: item.name,
          type: item.type,
          ...(isWorkspaceFolder(item)
            ? { color: item.color, icon: item.icon }
            : {}),
        });
        remoteIds.set(item.id, created.id);
        remoteRootId = remoteRootId ?? created.id;

        if (isWorkspaceDocument(item)) {
          const remoteDocument = mapCloudWorkspaceItem(
            created,
            item.content,
          );
          if (!isWorkspaceDocument(remoteDocument)) {
            throw new Error("The workspace API returned a non-document item.");
          }
          const completed = await uploadWorkspaceDocument(
            remoteDocument,
            item.content,
          );
          createdItems.push(mapCloudWorkspaceItem(completed, item.content));
        } else {
          createdItems.push(mapCloudWorkspaceItem(created));
        }
      }
    } catch (error) {
      if (remoteRootId) {
        try {
          await workspaceApi.deleteItem(remoteRootId);
        } catch (cleanupError) {
          console.error(
            "[WorkspaceTransfer] failed to clean up partial cloud transfer:",
            cleanupError,
          );
        }
      }
      throw error;
    }

    const transferredIds = new Set(transferredItems.map((item) => item.id));
    const nextLocalItems = sourceItems.filter(
      (item) => !transferredIds.has(item.id),
    );
    await persistLocalWorkspaceItems(nextLocalItems);
    useCloudWorkspaceStore
      .getState()
      .setItems([...useCloudWorkspaceStore.getState().items, ...createdItems]);
    useLocalWorkspaceStore.getState().setItems(nextLocalItems);
    return remoteIds.get(itemId) ?? false;
  } catch (error) {
    const apiError = toWorkspaceApiError(error);
    useCloudWorkspaceStore.getState().setCloudError(apiError);
    console.error("[WorkspaceTransfer] transfer failed:", error);
    return false;
  } finally {
    setCloudTransferOperation(null);
  }
}

export async function copyWorkspaceItemBetweenSources({
  itemId,
  source,
  destination,
  destinationParentId,
}: {
  itemId: string;
  source: "local" | "cloud";
  destination: "local" | "cloud";
  destinationParentId: string | null;
}) {
  const cloudState = useCloudWorkspaceStore.getState();

  if (
    cloudState.operation !== null ||
    cloudState.isHydrating ||
    ((source === "cloud" || destination === "cloud") &&
      !cloudState.isHydrated)
  ) {
    return false;
  }

  if (source === "local" && destination === "local") {
    await useLocalWorkspaceStore.getState().flushAllPendingContent();
    const sourceItems = useLocalWorkspaceStore.getState().items;
    const result = copyWorkspaceItem(
      sourceItems,
      sourceItems,
      itemId,
      destinationParentId,
    );

    if (!result) {
      return false;
    }

    await persistLocalWorkspaceItems(result.items);
    useLocalWorkspaceStore.getState().setItems(result.items);
    return result.copiedItemId ?? false;
  }

  setCloudTransferOperation("copy");
  cloudState.setCloudError(null);

  try {
    if (source === "cloud") {
      await cloudState.flushAllPendingContentAndSave();

      const sourceItems = useCloudWorkspaceStore.getState().items;
      const sourceDocuments = (
        getTransferredItems(sourceItems, itemId) ?? []
      ).filter(isWorkspaceDocument);
      await Promise.all(
        sourceDocuments.map((document) =>
          useCloudWorkspaceStore.getState().loadDocumentContent(document.id),
        ),
      );
    } else {
      await useLocalWorkspaceStore.getState().flushAllPendingContent();
    }

    const sourceItems =
      source === "cloud"
        ? useCloudWorkspaceStore.getState().items
        : useLocalWorkspaceStore.getState().items;
    const destinationItems =
      destination === "cloud"
        ? useCloudWorkspaceStore.getState().items
        : useLocalWorkspaceStore.getState().items;

    if (destination === "local") {
      const result = copyWorkspaceItem(
        sourceItems,
        destinationItems,
        itemId,
        destinationParentId,
      );

      if (!result) {
        return false;
      }

      await persistLocalWorkspaceItems(result.items);
      useLocalWorkspaceStore.getState().setItems(result.items);
      return result.copiedItemId ?? false;
    }

    const sourceItem = sourceItems.find((item) => item.id === itemId);
    const copiedItems = getTransferredItems(sourceItems, itemId);
    const destinationFolder = destinationItems.find(
      (item) =>
        isWorkspaceFolder(item) && item.id === destinationParentId,
    );

    if (
      !sourceItem ||
      !copiedItems ||
      (destinationParentId !== null && !destinationFolder)
    ) {
      return false;
    }

    const validation = validateCloudTransfer(sourceItems, itemId);
    if (!validation.valid) {
      setCloudTransferValidationError(validation.message);
      return false;
    }

    const remoteIds = new Map<string, string>();
    const createdItems: WorkspaceItem[] = [];
    let remoteRootId: string | null = null;
    const createOrder = [...copiedItems].sort((left, right) => {
      if (isWorkspaceFolder(left) !== isWorkspaceFolder(right)) {
        return isWorkspaceFolder(left) ? -1 : 1;
      }

      return getFolderDepth(copiedItems, left) - getFolderDepth(
        copiedItems,
        right,
      );
    });

    try {
      for (const item of createOrder) {
        const parentId =
          item.id === itemId
            ? destinationParentId
            : item.parent_id
              ? (remoteIds.get(item.parent_id) ?? null)
              : null;

        if (item.id !== itemId && !parentId) {
          throw new Error("Unable to resolve the copied workspace parent.");
        }

        const created = await workspaceApi.createItem({
          parentId,
          name: item.name,
          type: item.type,
          ...(isWorkspaceFolder(item)
            ? { color: item.color, icon: item.icon }
            : {}),
        });
        remoteIds.set(item.id, created.id);
        remoteRootId = remoteRootId ?? created.id;

        if (isWorkspaceDocument(item)) {
          const remoteDocument = mapCloudWorkspaceItem(
            created,
            item.content,
          );
          if (!isWorkspaceDocument(remoteDocument)) {
            throw new Error("The workspace API returned a non-document item.");
          }

          const completed = await uploadWorkspaceDocument(
            remoteDocument,
            item.content,
          );
          createdItems.push(mapCloudWorkspaceItem(completed, item.content));
        } else {
          createdItems.push(mapCloudWorkspaceItem(created));
        }
      }
    } catch (error) {
      if (remoteRootId) {
        try {
          await workspaceApi.deleteItem(remoteRootId);
        } catch (cleanupError) {
          console.error(
            "[WorkspaceCopy] failed to clean up partial cloud copy:",
            cleanupError,
          );
        }
      }
      throw error;
    }

    useCloudWorkspaceStore
      .getState()
      .setItems([...destinationItems, ...createdItems]);
    return remoteIds.get(itemId) ?? false;
  } catch (error) {
    const apiError = toWorkspaceApiError(error);
    useCloudWorkspaceStore.getState().setCloudError(apiError);
    console.error("[WorkspaceCopy] copy failed:", error);
    return false;
  } finally {
    setCloudTransferOperation(null);
  }
}
