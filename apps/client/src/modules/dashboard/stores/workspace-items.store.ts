import { create } from "zustand";

import {
  CLOUD_WORKSPACE_ITEMS,
  LOCAL_WORKSPACE_ITEMS,
} from "@/modules/dashboard/constants/document-workspaces";
import { SELECTED_DOCUMENT_ID } from "@/modules/dashboard/constants/mock-documents";
import type {
  DocumentFolderColor,
  DocumentSource,
  WorkspaceDocumentItem,
  WorkspaceFolderItem,
  WorkspaceItem,
} from "@/modules/dashboard/document/model/document.types";

export const DOCUMENT_CONTENT_DEBOUNCE_MS = 500;
export const MAX_MARKDOWN_CHARACTERS = 20_000;
export const SESSION_MARKDOWN_CHARACTER_LIMIT = Number.POSITIVE_INFINITY;
export const UNTITLED_DOCUMENT_TITLE = "Untitled";

type PendingContentUpdate = {
  content: string;
  timeoutId: ReturnType<typeof setTimeout>;
};

type WorkspaceItemsStoreState = {
  activeSource: DocumentSource;
  localItems: WorkspaceItem[];
  cloudItems: WorkspaceItem[];
  localCollapsedFolderIds: string[];
  cloudCollapsedFolderIds: string[];
  selectedDocumentId: string | null;
  pendingContentByDocumentId: Record<string, string>;
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
  createDocument: (
    source: DocumentSource,
    title?: string,
    parentId?: string | null,
  ) => string;
  renameDocument: (
    source: DocumentSource,
    documentId: string,
    title: string,
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
  selectDocument: (documentId: string) => void;
  clearSelection: () => void;
  scheduleContentUpdate: (documentId: string, content: string) => void;
  flushPendingContent: (documentId: string) => void;
  flushAllPendingContent: () => void;
};

const pendingContentUpdates = new Map<string, PendingContentUpdate>();

export function isWorkspaceDocument(
  item: WorkspaceItem,
): item is WorkspaceDocumentItem {
  return item.type === "document";
}

export function isWorkspaceFolder(
  item: WorkspaceItem,
): item is WorkspaceFolderItem {
  return item.type === "folder";
}

export function getWorkspaceItems(
  state: Pick<WorkspaceItemsStoreState, "localItems" | "cloudItems">,
  source: DocumentSource,
) {
  return source === "local" ? state.localItems : state.cloudItems;
}

export function getWorkspaceRoute(items: WorkspaceItem[], itemId: string) {
  const names: string[] = [];
  const visited = new Set<string>();
  let currentId: string | null = itemId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const item = items.find((candidate) => candidate.id === currentId);

    if (!item) {
      break;
    }

    names.push(item.name);
    currentId = item.parent_id;
  }

  return `/${names.reverse().join("/")}`;
}

function setWorkspaceItems(
  set: (
    update:
      | Partial<WorkspaceItemsStoreState>
      | ((
          state: WorkspaceItemsStoreState,
        ) => Partial<WorkspaceItemsStoreState>),
  ) => void,
  source: DocumentSource,
  items: WorkspaceItem[],
) {
  set(source === "local" ? { localItems: items } : { cloudItems: items });
}

function getCollapsedFolderIds(
  state: WorkspaceItemsStoreState,
  source: DocumentSource,
) {
  return source === "local"
    ? state.localCollapsedFolderIds
    : state.cloudCollapsedFolderIds;
}

function createItemId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function cancelPendingContentUpdate(documentId: string) {
  const pendingUpdate = pendingContentUpdates.get(documentId);

  if (!pendingUpdate) {
    return;
  }

  clearTimeout(pendingUpdate.timeoutId);
  pendingContentUpdates.delete(documentId);
}

function omitPendingContent(
  pendingContentByDocumentId: Record<string, string>,
  documentId: string,
) {
  const nextPendingContent = { ...pendingContentByDocumentId };
  delete nextPendingContent[documentId];
  return nextPendingContent;
}

function limitMarkdownContent(content: string, maxCharacters: number) {
  return Number.isFinite(maxCharacters)
    ? content.slice(0, maxCharacters)
    : content;
}

function getFirstNonEmptyLine(markdown: string) {
  let offset = 0;

  while (offset <= markdown.length) {
    const lineEnd = markdown.indexOf("\n", offset);
    const end = lineEnd === -1 ? markdown.length : lineEnd;
    const line = markdown.slice(offset, end).replace(/\r$/, "");

    if (line.trim().length > 0) {
      return { line, offset };
    }

    if (lineEnd === -1) {
      break;
    }

    offset = lineEnd + 1;
  }

  return null;
}

function getFirstHeadingTitle(markdown: string) {
  const firstLine = getFirstNonEmptyLine(markdown);
  const match = firstLine?.line.match(/^[ \t]{0,3}#(?:[ \t]+(.*?))?[ \t]*$/);

  if (!match) {
    return null;
  }

  const title = (match[1] ?? "").replace(/[ \t]+#+[ \t]*$/, "").trim();

  return title;
}

export function normalizeMarkdownDocument(
  markdown: string,
  maxCharacters = MAX_MARKDOWN_CHARACTERS,
) {
  const firstLine = getFirstNonEmptyLine(markdown);
  const title = getFirstHeadingTitle(markdown);

  if (firstLine && title !== null) {
    return {
      content: limitMarkdownContent(
        firstLine.offset > 0 ? markdown.slice(firstLine.offset) : markdown,
        maxCharacters,
      ),
      title: title || UNTITLED_DOCUMENT_TITLE,
    };
  }

  const body = firstLine ? markdown.slice(firstLine.offset) : "";

  return {
    content: limitMarkdownContent(
      `# ${UNTITLED_DOCUMENT_TITLE}\n\n${body}`,
      maxCharacters,
    ),
    title: UNTITLED_DOCUMENT_TITLE,
  };
}

export function createInitialMarkdown(title?: string) {
  const trimmedTitle = title?.trim();

  return trimmedTitle ? `# ${trimmedTitle}\n\n` : "#\n\n";
}

function normalizeWorkspaceItems(items: WorkspaceItem[]) {
  return items.map((item) => {
    if (!isWorkspaceDocument(item)) {
      return item;
    }

    const normalized = normalizeMarkdownDocument(
      item.content ?? "",
      SESSION_MARKDOWN_CHARACTER_LIMIT,
    );

    return {
      ...item,
      name: normalized.title,
      content: normalized.content,
    };
  });
}

function getDescendantFolderIds(items: WorkspaceItem[], folderId: string) {
  const descendantIds = new Set<string>();
  const collect = (currentId: string) => {
    descendantIds.add(currentId);
    items
      .filter((item) => isWorkspaceFolder(item) && item.parent_id === currentId)
      .forEach((item) => collect(item.id));
  };

  collect(folderId);
  return descendantIds;
}

function getDocumentSource(
  state: WorkspaceItemsStoreState,
  documentId: string,
): DocumentSource | null {
  if (
    state.localItems.some(
      (item) => isWorkspaceDocument(item) && item.id === documentId,
    )
  ) {
    return "local";
  }

  if (
    state.cloudItems.some(
      (item) => isWorkspaceDocument(item) && item.id === documentId,
    )
  ) {
    return "cloud";
  }

  return null;
}

function commitContent(
  set: (
    update:
      | Partial<WorkspaceItemsStoreState>
      | ((
          state: WorkspaceItemsStoreState,
        ) => Partial<WorkspaceItemsStoreState>),
  ) => void,
  documentId: string,
  content: string,
) {
  set((state) => {
    const source = getDocumentSource(state, documentId);

    if (!source) {
      return {
        pendingContentByDocumentId: omitPendingContent(
          state.pendingContentByDocumentId,
          documentId,
        ),
      };
    }

    const items = getWorkspaceItems(state, source);
    const document = items.find(
      (item): item is WorkspaceDocumentItem =>
        isWorkspaceDocument(item) && item.id === documentId,
    );
    const title = getFirstHeadingTitle(content) || UNTITLED_DOCUMENT_TITLE;

    if (
      !document ||
      (document.content === content && document.name === title)
    ) {
      return {
        pendingContentByDocumentId: omitPendingContent(
          state.pendingContentByDocumentId,
          documentId,
        ),
      };
    }

    const nextItems = items.map((item) =>
      isWorkspaceDocument(item) && item.id === documentId
        ? { ...item, content, name: title, updated_at: now() }
        : item,
    );

    return {
      ...(source === "local"
        ? { localItems: nextItems }
        : { cloudItems: nextItems }),
      pendingContentByDocumentId: omitPendingContent(
        state.pendingContentByDocumentId,
        documentId,
      ),
    };
  });
}

export const useWorkspaceItemsStore = create<WorkspaceItemsStoreState>(
  (set, get) => ({
    activeSource: "local",
    localItems: normalizeWorkspaceItems(LOCAL_WORKSPACE_ITEMS),
    cloudItems: CLOUD_WORKSPACE_ITEMS,
    localCollapsedFolderIds: [],
    cloudCollapsedFolderIds: [],
    selectedDocumentId: SELECTED_DOCUMENT_ID,
    pendingContentByDocumentId: {},

    setActiveSource: (activeSource) => {
      const currentDocumentId = get().selectedDocumentId;

      if (currentDocumentId) {
        get().flushPendingContent(currentDocumentId);
      }

      set({ activeSource, selectedDocumentId: null });
    },

    toggleFolderExpanded: (source, folderId) => {
      const collapsedFolderIds = getCollapsedFolderIds(get(), source);
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

      const items = getWorkspaceItems(get(), source);

      if (
        parentId &&
        !items.some((item) => isWorkspaceFolder(item) && item.id === parentId)
      ) {
        return null;
      }

      const timestamp = now();
      const folder: WorkspaceItem = {
        id: createItemId(`${source}-folder`),
        type: "folder",
        parent_id: parentId,
        name,
        created_at: timestamp,
        updated_at: timestamp,
        color,
      };

      setWorkspaceItems(set, source, [...items, folder]);
      return folder.id;
    },

    renameFolder: (source, folderId, rawName, color) => {
      const name = rawName.trim();

      if (!name) {
        return;
      }

      const items = getWorkspaceItems(get(), source);

      if (
        !items.some((item) => isWorkspaceFolder(item) && item.id === folderId)
      ) {
        return;
      }

      setWorkspaceItems(
        set,
        source,
        items.map((item) =>
          isWorkspaceFolder(item) && item.id === folderId
            ? { ...item, name, color, updated_at: now() }
            : item,
        ),
      );
    },

    deleteFolder: (source, folderId) => {
      const items = getWorkspaceItems(get(), source);
      const folder = items.find(
        (item) => isWorkspaceFolder(item) && item.id === folderId,
      );

      if (!folder || folder.parent_id === null) {
        return false;
      }

      const folderIdsToDelete = getDescendantFolderIds(items, folderId);
      const timestamp = now();
      const nextItems = items
        .filter((item) => !folderIdsToDelete.has(item.id))
        .map((item) =>
          isWorkspaceDocument(item) &&
          item.parent_id !== null &&
          folderIdsToDelete.has(item.parent_id)
            ? { ...item, deleted_at: timestamp, updated_at: timestamp }
            : item,
        );
      const collapsedFolderIds = getCollapsedFolderIds(get(), source).filter(
        (id) => !folderIdsToDelete.has(id),
      );

      set(
        source === "local"
          ? {
              localItems: nextItems,
              localCollapsedFolderIds: collapsedFolderIds,
            }
          : {
              cloudItems: nextItems,
              cloudCollapsedFolderIds: collapsedFolderIds,
            },
      );

      return true;
    },

    createDocument: (source, title, parentId = null) => {
      const trimmedTitle = title?.trim();
      const timestamp = now();
      const document: WorkspaceItem = {
        id: createItemId(`${source}-document`),
        type: "document",
        parent_id: parentId,
        name: trimmedTitle || UNTITLED_DOCUMENT_TITLE,
        created_at: timestamp,
        updated_at: timestamp,
        content: createInitialMarkdown(trimmedTitle),
        group: "documents",
      };

      const items = getWorkspaceItems(get(), source);
      setWorkspaceItems(set, source, [...items, document]);

      return document.id;
    },

    renameDocument: (source, documentId, rawTitle) => {
      const name = rawTitle.trim();

      if (!name) {
        return;
      }

      const items = getWorkspaceItems(get(), source);
      setWorkspaceItems(
        set,
        source,
        items.map((item) =>
          isWorkspaceDocument(item) && item.id === documentId
            ? { ...item, name, deleted_at: null, updated_at: now() }
            : item,
        ),
      );
    },

    moveDocument: (source, documentId, folderId) => {
      const items = getWorkspaceItems(get(), source);

      if (
        folderId &&
        !items.some((item) => isWorkspaceFolder(item) && item.id === folderId)
      ) {
        return;
      }

      setWorkspaceItems(
        set,
        source,
        items.map((item) =>
          isWorkspaceDocument(item) && item.id === documentId
            ? { ...item, parent_id: folderId, updated_at: now() }
            : item,
        ),
      );
    },

    moveFolder: (source, folderId, parentId) => {
      const items = getWorkspaceItems(get(), source);
      const folder = items.find(
        (item) => isWorkspaceFolder(item) && item.id === folderId,
      );

      if (!folder || folder.parent_id === null) {
        return false;
      }

      if (
        !parentId ||
        !items.some((item) => isWorkspaceFolder(item) && item.id === parentId)
      ) {
        return false;
      }

      const movedFolderIds = getDescendantFolderIds(items, folderId);

      if (movedFolderIds.has(parentId) || folder.parent_id === parentId) {
        return false;
      }

      setWorkspaceItems(
        set,
        source,
        items.map((item) =>
          isWorkspaceFolder(item) && item.id === folderId
            ? { ...item, parent_id: parentId, updated_at: now() }
            : item,
        ),
      );

      return true;
    },

    toggleFavorite: (source, documentId) => {
      const items = getWorkspaceItems(get(), source);
      setWorkspaceItems(
        set,
        source,
        items.map((item) =>
          isWorkspaceDocument(item) && item.id === documentId
            ? { ...item, favorite: !item.favorite, updated_at: now() }
            : item,
        ),
      );
    },

    deleteDocument: (source, documentId) => {
      const items = getWorkspaceItems(get(), source);
      const timestamp = now();

      setWorkspaceItems(
        set,
        source,
        items.map((item) =>
          isWorkspaceDocument(item) && item.id === documentId
            ? { ...item, deleted_at: timestamp, updated_at: timestamp }
            : item,
        ),
      );
    },

    selectDocument: (documentId) => {
      const currentDocumentId = get().selectedDocumentId;
      const items = getWorkspaceItems(get(), get().activeSource);

      if (
        currentDocumentId === documentId ||
        !items.some(
          (item) =>
            isWorkspaceDocument(item) &&
            item.id === documentId &&
            !item.deleted_at,
        )
      ) {
        return;
      }

      if (currentDocumentId) {
        get().flushPendingContent(currentDocumentId);
      }

      set({ selectedDocumentId: documentId });
    },

    clearSelection: () => {
      const currentDocumentId = get().selectedDocumentId;

      if (currentDocumentId) {
        get().flushPendingContent(currentDocumentId);
      }

      set({ selectedDocumentId: null });
    },

    scheduleContentUpdate: (documentId, content) => {
      const state = get();
      const source = getDocumentSource(state, documentId);
      const items = source ? getWorkspaceItems(state, source) : [];
      const document = items.find(
        (item): item is WorkspaceDocumentItem =>
          isWorkspaceDocument(item) && item.id === documentId,
      );

      if (!source || !document) {
        return;
      }

      const maxCharacters =
        source === "local"
          ? SESSION_MARKDOWN_CHARACTER_LIMIT
          : MAX_MARKDOWN_CHARACTERS;
      const limitedContent = normalizeMarkdownDocument(
        content,
        maxCharacters,
      ).content;

      if (document.content === limitedContent) {
        cancelPendingContentUpdate(documentId);
        set((currentState) => ({
          pendingContentByDocumentId: omitPendingContent(
            currentState.pendingContentByDocumentId,
            documentId,
          ),
        }));
        return;
      }

      cancelPendingContentUpdate(documentId);
      set((currentState) => ({
        pendingContentByDocumentId: {
          ...currentState.pendingContentByDocumentId,
          [documentId]: limitedContent,
        },
      }));

      const timeoutId = setTimeout(() => {
        const pendingUpdate = pendingContentUpdates.get(documentId);

        if (!pendingUpdate || pendingUpdate.timeoutId !== timeoutId) {
          return;
        }

        pendingContentUpdates.delete(documentId);
        commitContent(set, documentId, pendingUpdate.content);
      }, DOCUMENT_CONTENT_DEBOUNCE_MS);

      pendingContentUpdates.set(documentId, {
        content: limitedContent,
        timeoutId,
      });
    },

    flushPendingContent: (documentId) => {
      const pendingUpdate = pendingContentUpdates.get(documentId);

      if (!pendingUpdate) {
        return;
      }

      cancelPendingContentUpdate(documentId);
      commitContent(set, documentId, pendingUpdate.content);
    },

    flushAllPendingContent: () => {
      [...pendingContentUpdates.keys()].forEach((documentId) => {
        get().flushPendingContent(documentId);
      });
    },
  }),
);

export type { WorkspaceItemsStoreState };
