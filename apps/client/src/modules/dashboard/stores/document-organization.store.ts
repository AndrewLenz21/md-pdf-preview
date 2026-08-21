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

const CLOUD_ROOT_FOLDER_ID = "cloud-folder-root";
const CLOUD_ROOT_FOLDER: DocumentFolder = {
  id: CLOUD_ROOT_FOLDER_ID,
  name: "Cloud",
  parentId: null,
  route: `/${CLOUD_ROOT_FOLDER_ID}`,
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
  moveFolder: (
    source: DocumentSource,
    folderId: string,
    parentId: string | null,
  ) => boolean;
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

function createFolderId(source: DocumentSource) {
  return `${source}-folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getFolderRoute(folders: DocumentFolder[], folderId: string | null) {
  if (!folderId) {
    return "";
  }

  return (
    folders.find((folder) => folder.id === folderId)?.route ?? `/${folderId}`
  );
}

function getDocumentRoute(
  folders: DocumentFolder[],
  documentId: string,
  folderId: string | null,
) {
  return `${getFolderRoute(folders, folderId)}/${documentId}`;
}

function getDescendantFolderIds(folders: DocumentFolder[], folderId: string) {
  const descendantIds = new Set<string>();
  const collect = (currentId: string) => {
    descendantIds.add(currentId);
    folders
      .filter((folder) => folder.parentId === currentId)
      .forEach((folder) => collect(folder.id));
  };

  collect(folderId);
  return descendantIds;
}

function getFolderRoutes(folders: DocumentFolder[]) {
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const routes = new Map<string, string>();

  const resolveRoute = (folderId: string): string => {
    const cachedRoute = routes.get(folderId);
    if (cachedRoute) {
      return cachedRoute;
    }

    const folder = folderById.get(folderId);
    if (!folder) {
      return `/${folderId}`;
    }

    const route = folder.parentId
      ? `${resolveRoute(folder.parentId)}/${folder.id}`
      : `/${folder.id}`;
    routes.set(folderId, route);
    return route;
  };

  folders.forEach((folder) => resolveRoute(folder.id));
  return routes;
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

      if (parentId && !folders.some((folder) => folder.id === parentId)) {
        return null;
      }

      const id = createFolderId(source);
      const folder = {
        id,
        name,
        parentId,
        route: `${getFolderRoute(folders, parentId)}/${id}`,
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

      const folderIdsToDelete = getDescendantFolderIds(folders, folderId);

      const documents = getDocuments(get(), source);
      const nextDocuments = Object.fromEntries(
        Object.entries(documents).map(([documentId, organization]) =>
          organization.parentId && folderIdsToDelete.has(organization.parentId)
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
        parentId: null,
        route: getDocumentRoute(getFolders(get(), source), documentId, null),
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

      if (folderId && !folders.some((folder) => folder.id === folderId)) {
        return;
      }

      const documents = getDocuments(get(), source);
      const current = documents[documentId] ?? {
        parentId: null,
        route: getDocumentRoute(folders, documentId, null),
      };

      set(
        source === "local"
          ? {
              localDocuments: {
                ...documents,
                [documentId]: {
                  ...current,
                  parentId: folderId,
                  route: getDocumentRoute(folders, documentId, folderId),
                },
              },
            }
          : {
              cloudDocuments: {
                ...documents,
                [documentId]: {
                  ...current,
                  parentId: folderId,
                  route: getDocumentRoute(folders, documentId, folderId),
                },
              },
            },
      );
    },

    moveFolder: (source, folderId, parentId) => {
      const folders = getFolders(get(), source);
      const folder = folders.find((item) => item.id === folderId);

      if (!folder || folder.parentId === null) {
        return false;
      }

      if (!parentId || !folders.some((item) => item.id === parentId)) {
        return false;
      }

      const movedFolderIds = getDescendantFolderIds(folders, folderId);
      if (parentId && movedFolderIds.has(parentId)) {
        return false;
      }

      if (folder.parentId === parentId) {
        return false;
      }

      const nextFolders = folders.map((item) =>
        item.id === folderId ? { ...item, parentId } : item,
      );
      const routes = getFolderRoutes(nextFolders);
      const nextFoldersWithRoutes = nextFolders.map((item) => ({
        ...item,
        route: routes.get(item.id) ?? item.route,
      }));
      const documents = getDocuments(get(), source);
      const nextDocuments = Object.fromEntries(
        Object.entries(documents).map(([documentId, organization]) => {
          if (
            !organization.parentId ||
            !movedFolderIds.has(organization.parentId)
          ) {
            return [documentId, organization];
          }

          const parentRoute = routes.get(organization.parentId) ?? "";
          return [
            documentId,
            {
              ...organization,
              route: `${parentRoute}/${documentId}`,
            },
          ];
        }),
      );

      set(
        source === "local"
          ? {
              localFolders: nextFoldersWithRoutes,
              localDocuments: nextDocuments,
            }
          : {
              cloudFolders: nextFoldersWithRoutes,
              cloudDocuments: nextDocuments,
            },
      );

      return true;
    },

    toggleFavorite: (source, documentId) => {
      const documents = getDocuments(get(), source);
      const current = documents[documentId] ?? {
        parentId: null,
        route: getDocumentRoute(getFolders(get(), source), documentId, null),
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
        parentId: null,
        route: getDocumentRoute(getFolders(get(), source), documentId, null),
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
