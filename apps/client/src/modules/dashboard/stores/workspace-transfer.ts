import type { WorkspaceItem } from "@/modules/dashboard/document/model/document.types";
import {
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
    item.parent_id === null ||
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

  if (!sourceItem || !transferredItems || sourceItem.parent_id === null) {
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

  return transferredItems.map((item) => ({
    ...item,
    id: idMap.get(item.id) ?? item.id,
    parent_id:
      item.id === itemId
        ? destinationParentId
        : item.parent_id === null
          ? null
          : idMap.get(item.parent_id) ?? item.parent_id,
  }));
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

function setCloudTransferOperation(operation: CloudWorkspaceOperation | null) {
  useCloudWorkspaceStore.getState().setCloudOperation(operation);
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

      const nextLocalItems = [...destinationItems, ...mappedItems];
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
      return true;
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
      initialSourceItem.parent_id === null ||
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
    return true;
  } catch (error) {
    const apiError = toWorkspaceApiError(error);
    useCloudWorkspaceStore.getState().setCloudError(apiError);
    console.error("[WorkspaceTransfer] transfer failed:", error);
    return false;
  } finally {
    setCloudTransferOperation(null);
  }
}
