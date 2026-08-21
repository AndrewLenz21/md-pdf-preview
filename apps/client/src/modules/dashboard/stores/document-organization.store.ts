import { create } from "zustand";

import {
  CLOUD_WORKSPACE_DATA,
  LOCAL_WORKSPACE_DATA,
} from "@/modules/dashboard/constants/document-workspaces";
import type {
  DocumentFolder,
  DocumentOrganization,
  DocumentSource,
  DocumentFolderColor,
} from "@/modules/dashboard/document/model/document.types";

export const MAX_FOLDER_DEPTH = 20;

const CLOUD_ROOT_FOLDER_ID = "cloud-folder-root";
const CLOUD_ROOT_FOLDER: DocumentFolder = {
  id: CLOUD_ROOT_FOLDER_ID,
  name: "Cloud",
  parentId: null,
  path: `/${CLOUD_ROOT_FOLDER_ID}`,
  color: "primary",
};

const CLOUD_SYSTEM_FOLDERS: DocumentFolder[] = [CLOUD_ROOT_FOLDER];

type DocumentOrganizationStoreState = {
  activeSource: DocumentSource;
  localFolders: DocumentFolder[];
  cloudFolders: DocumentFolder[];
  localCollapsedFolderIds: string[];
  cloudCollapsedFolderIds: string[];
  localDocuments: Record<string, DocumentOrganization>;
  cloudDocuments: Record<string, DocumentOrganization>;
  setActiveSource: (source: DocumentSource) => void;
  toggleFolderExpanded: (source: DocumentSource, folderId: string) => void;
  createFolder: (
    source: DocumentSource,
    name: string,
    parentId?: string | null,
    color?: DocumentFolderColor,
  ) => string | null;
  renameFolder: (
    source: DocumentSource,
    folderId: string,
    name: string,
    color: DocumentFolderColor,
  ) => void;
  deleteFolder: (source: DocumentSource, folderId: string) => boolean;
  renameDocument: (
    source: DocumentSource,
    documentId: string,
    displayTitle: string,
  ) => void;
  moveDocument: (
    source: DocumentSource,
    documentId: string,
    folderId: string | null,
  ) => void;
  toggleFavorite: (source: DocumentSource, documentId: string) => void;
  deleteDocument: (source: DocumentSource, documentId: string) => void;
};

function getFolders(
  state: DocumentOrganizationStoreState,
  source: DocumentSource,
) {
  return source === "local" ? state.localFolders : state.cloudFolders;
}

function getDocuments(
  state: DocumentOrganizationStoreState,
  source: DocumentSource,
) {
  return source === "local" ? state.localDocuments : state.cloudDocuments;
}

function getFolderDepth(
  folders: DocumentFolder[],
  folderId: string | null,
): number {
  if (!folderId) {
    return 0;
  }

  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  let depth = 0;
  let currentId: string | null = folderId;

  while (currentId) {
    const folder = folderById.get(currentId);

    if (!folder) {
      return MAX_FOLDER_DEPTH + 1;
    }

    depth += 1;
    currentId = folder.parentId;
  }

  return depth;
}

function createFolderId(source: DocumentSource) {
  return `${source}-folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getFolderPath(folders: DocumentFolder[], folderId: string | null) {
  if (!folderId) {
    return "";
  }

  return (
    folders.find((folder) => folder.id === folderId)?.path ?? `/${folderId}`
  );
}

function getDocumentPath(
  folders: DocumentFolder[],
  documentId: string,
  folderId: string | null,
) {
  return `${getFolderPath(folders, folderId)}/${documentId}`;
}

export const useDocumentOrganizationStore =
  create<DocumentOrganizationStoreState>((set, get) => ({
    activeSource: "local",
    localFolders: LOCAL_WORKSPACE_DATA.folders,
    cloudFolders: [...CLOUD_SYSTEM_FOLDERS, ...CLOUD_WORKSPACE_DATA.folders],
    localCollapsedFolderIds: [],
    cloudCollapsedFolderIds: [],
    localDocuments: LOCAL_WORKSPACE_DATA.organization,
    cloudDocuments: CLOUD_WORKSPACE_DATA.organization,

    setActiveSource: (activeSource) => set({ activeSource }),

    toggleFolderExpanded: (source, folderId) => {
      const collapsedFolderIds =
        source === "local"
          ? get().localCollapsedFolderIds
          : get().cloudCollapsedFolderIds;
      const isCollapsed = collapsedFolderIds.includes(folderId);
      const nextCollapsedFolderIds = isCollapsed
        ? collapsedFolderIds.filter((id) => id !== folderId)
        : [...collapsedFolderIds, folderId];

      set(
        source === "local"
          ? { localCollapsedFolderIds: nextCollapsedFolderIds }
          : { cloudCollapsedFolderIds: nextCollapsedFolderIds },
      );
    },

    createFolder: (source, rawName, parentId = null, color = "primary") => {
      const name = rawName.trim();

      if (!name) {
        return null;
      }

      const folders = getFolders(get(), source);

      if (
        parentId &&
        (!folders.some((folder) => folder.id === parentId) ||
          getFolderDepth(folders, parentId) >= MAX_FOLDER_DEPTH)
      ) {
        return null;
      }

      const id = createFolderId(source);
      const folder = {
        id,
        name,
        parentId,
        path: `${getFolderPath(folders, parentId)}/${id}`,
        color,
      };

      set(
        source === "local"
          ? { localFolders: [...folders, folder] }
          : { cloudFolders: [...folders, folder] },
      );

      return id;
    },

    renameFolder: (source, folderId, rawName, color) => {
      const name = rawName.trim();
      const folders = getFolders(get(), source);

      if (!name || !folders.some((folder) => folder.id === folderId)) {
        return;
      }

      const nextFolders = folders.map((folder) =>
        folder.id === folderId ? { ...folder, name, color } : folder,
      );

      set(
        source === "local"
          ? { localFolders: nextFolders }
          : { cloudFolders: nextFolders },
      );
    },

    deleteFolder: (source, folderId) => {
      const folders = getFolders(get(), source);
      const folder = folders.find((item) => item.id === folderId);

      if (!folder || folder.parentId === null) {
        return false;
      }

      const folderIdsToDelete = new Set<string>();
      const collectFolderIds = (currentId: string) => {
        folderIdsToDelete.add(currentId);
        folders
          .filter((item) => item.parentId === currentId)
          .forEach((childFolder) => collectFolderIds(childFolder.id));
      };

      collectFolderIds(folderId);

      const documents = getDocuments(get(), source);
      const nextDocuments = Object.fromEntries(
        Object.entries(documents).map(([documentId, organization]) =>
          organization.folderId && folderIdsToDelete.has(organization.folderId)
            ? [documentId, { ...organization, deleted: true }]
            : [documentId, organization],
        ),
      );
      const collapsedFolderIds =
        source === "local"
          ? get().localCollapsedFolderIds
          : get().cloudCollapsedFolderIds;
      const nextCollapsedFolderIds = collapsedFolderIds.filter(
        (id) => !folderIdsToDelete.has(id),
      );
      const nextFolders = folders.filter(
        (item) => !folderIdsToDelete.has(item.id),
      );

      set(
        source === "local"
          ? {
              localFolders: nextFolders,
              localDocuments: nextDocuments,
              localCollapsedFolderIds: nextCollapsedFolderIds,
            }
          : {
              cloudFolders: nextFolders,
              cloudDocuments: nextDocuments,
              cloudCollapsedFolderIds: nextCollapsedFolderIds,
            },
      );

      return true;
    },

    renameDocument: (source, documentId, rawTitle) => {
      const displayTitle = rawTitle.trim();

      if (!displayTitle) {
        return;
      }

      const documents = getDocuments(get(), source);
      const current = documents[documentId] ?? {
        folderId: null,
        path: getDocumentPath(getFolders(get(), source), documentId, null),
      };

      set(
        source === "local"
          ? {
              localDocuments: {
                ...documents,
                [documentId]: { ...current, displayTitle, deleted: false },
              },
            }
          : {
              cloudDocuments: {
                ...documents,
                [documentId]: { ...current, displayTitle, deleted: false },
              },
            },
      );
    },

    moveDocument: (source, documentId, folderId) => {
      const folders = getFolders(get(), source);

      if (
        folderId &&
        (!folders.some((folder) => folder.id === folderId) ||
          getFolderDepth(folders, folderId) > MAX_FOLDER_DEPTH)
      ) {
        return;
      }

      const documents = getDocuments(get(), source);
      const current = documents[documentId] ?? {
        folderId: null,
        path: getDocumentPath(folders, documentId, null),
      };

      set(
        source === "local"
          ? {
              localDocuments: {
                ...documents,
                [documentId]: {
                  ...current,
                  folderId,
                  path: getDocumentPath(folders, documentId, folderId),
                },
              },
            }
          : {
              cloudDocuments: {
                ...documents,
                [documentId]: {
                  ...current,
                  folderId,
                  path: getDocumentPath(folders, documentId, folderId),
                },
              },
            },
      );
    },

    toggleFavorite: (source, documentId) => {
      const documents = getDocuments(get(), source);
      const current = documents[documentId] ?? {
        folderId: null,
        path: getDocumentPath(getFolders(get(), source), documentId, null),
      };

      set(
        source === "local"
          ? {
              localDocuments: {
                ...documents,
                [documentId]: { ...current, favorite: !current.favorite },
              },
            }
          : {
              cloudDocuments: {
                ...documents,
                [documentId]: { ...current, favorite: !current.favorite },
              },
            },
      );
    },

    deleteDocument: (source, documentId) => {
      const documents = getDocuments(get(), source);
      const current = documents[documentId] ?? {
        folderId: null,
        path: getDocumentPath(getFolders(get(), source), documentId, null),
      };

      set(
        source === "local"
          ? {
              localDocuments: {
                ...documents,
                [documentId]: { ...current, deleted: true },
              },
            }
          : {
              cloudDocuments: {
                ...documents,
                [documentId]: { ...current, deleted: true },
              },
            },
      );
    },
  }));

export function getFolderDepthForDisplay(
  folders: DocumentFolder[],
  folderId: string | null,
) {
  return getFolderDepth(folders, folderId);
}
