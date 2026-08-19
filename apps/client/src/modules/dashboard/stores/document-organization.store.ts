import { create } from "zustand";

import type {
  DocumentFolder,
  DocumentOrganization,
  DocumentSource,
  DocumentFolderColor,
} from "@/modules/dashboard/document/model/document.types";

export const MAX_FOLDER_DEPTH = 20;

const LOCAL_RECENT_FOLDER_ID = "local-folder-recent";
const LOCAL_DOCUMENTS_FOLDER_ID = "local-folder-documents";
const LOCAL_ROOT_FOLDER_ID = "local-folder-root";
const CLOUD_ROOT_FOLDER_ID = "cloud-folder-root";
const LOCAL_WORKING_SET_FOLDER_ID = "local-folder-working-set";
const LOCAL_RESEARCH_NOTES_FOLDER_ID = "local-folder-research-notes";
const LOCAL_PLANNING_FOLDER_ID = "local-folder-planning";
const LOCAL_NOTES_FOLDER_ID = "local-folder-notes";

const INITIAL_LOCAL_FOLDERS: DocumentFolder[] = [
  {
    id: LOCAL_ROOT_FOLDER_ID,
    name: "Workspace",
    parentId: null,
    color: "primary",
  },
  {
    id: LOCAL_RECENT_FOLDER_ID,
    name: "Recents",
    parentId: LOCAL_ROOT_FOLDER_ID,
    color: "blue",
  },
  {
    id: LOCAL_DOCUMENTS_FOLDER_ID,
    name: "Documents",
    parentId: LOCAL_ROOT_FOLDER_ID,
    color: "violet",
  },
  {
    id: LOCAL_WORKING_SET_FOLDER_ID,
    name: "Working set",
    parentId: LOCAL_RECENT_FOLDER_ID,
    color: "blue",
  },
  {
    id: LOCAL_RESEARCH_NOTES_FOLDER_ID,
    name: "Research notes",
    parentId: LOCAL_RECENT_FOLDER_ID,
    color: "emerald",
  },
  {
    id: LOCAL_PLANNING_FOLDER_ID,
    name: "Planning",
    parentId: LOCAL_DOCUMENTS_FOLDER_ID,
    color: "amber",
  },
  {
    id: LOCAL_NOTES_FOLDER_ID,
    name: "Notes",
    parentId: LOCAL_DOCUMENTS_FOLDER_ID,
    color: "rose",
  },
];

const INITIAL_CLOUD_FOLDERS: DocumentFolder[] = [
  {
    id: CLOUD_ROOT_FOLDER_ID,
    name: "Cloud",
    parentId: null,
    color: "primary",
  },
];

const INITIAL_LOCAL_DOCUMENT_ORGANIZATION: Record<
  string,
  DocumentOrganization
> = {
  "project-research": { folderId: LOCAL_WORKING_SET_FOLDER_ID },
  "product-proposal": { folderId: LOCAL_WORKING_SET_FOLDER_ID },
  "cash-basis-tax-view": { folderId: LOCAL_WORKING_SET_FOLDER_ID },
  "research-notes": { folderId: LOCAL_RESEARCH_NOTES_FOLDER_ID },
  "meeting-notes": { folderId: LOCAL_NOTES_FOLDER_ID },
  architecture: { folderId: LOCAL_PLANNING_FOLDER_ID },
  roadmap: { folderId: LOCAL_PLANNING_FOLDER_ID },
  ideas: { folderId: LOCAL_NOTES_FOLDER_ID },
};

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

export const useDocumentOrganizationStore =
  create<DocumentOrganizationStoreState>((set, get) => ({
    activeSource: "local",
    localFolders: INITIAL_LOCAL_FOLDERS,
    cloudFolders: INITIAL_CLOUD_FOLDERS,
    localCollapsedFolderIds: [],
    cloudCollapsedFolderIds: [],
    localDocuments: INITIAL_LOCAL_DOCUMENT_ORGANIZATION,
    cloudDocuments: {},

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
      const folder = { id, name, parentId, color };

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

    renameDocument: (source, documentId, rawTitle) => {
      const displayTitle = rawTitle.trim();

      if (!displayTitle) {
        return;
      }

      const documents = getDocuments(get(), source);
      const current = documents[documentId] ?? { folderId: null };

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
      const current = documents[documentId] ?? { folderId: null };

      set(
        source === "local"
          ? {
              localDocuments: {
                ...documents,
                [documentId]: { ...current, folderId },
              },
            }
          : {
              cloudDocuments: {
                ...documents,
                [documentId]: { ...current, folderId },
              },
            },
      );
    },

    toggleFavorite: (source, documentId) => {
      const documents = getDocuments(get(), source);
      const current = documents[documentId] ?? { folderId: null };

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
      const current = documents[documentId] ?? { folderId: null };

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
