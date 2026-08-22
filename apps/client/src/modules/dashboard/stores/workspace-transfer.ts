import type { WorkspaceItem } from "@/modules/dashboard/document/model/document.types";

import {
  isWorkspaceDocument,
  isWorkspaceFolder,
} from "./workspace-items.store";

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

export function transferWorkspaceItem({
  itemId,
  sourceItems,
  destinationItems,
  destinationParentId,
}: {
  itemId: string;
  sourceItems: WorkspaceItem[];
  destinationItems: WorkspaceItem[];
  destinationParentId: string;
}): WorkspaceTransferResult | null {
  const item = sourceItems.find((candidate) => candidate.id === itemId);
  const destinationParent = destinationItems.find(
    (candidate) =>
      isWorkspaceFolder(candidate) && candidate.id === destinationParentId,
  );

  if (!item || item.parent_id === null || !destinationParent) {
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
