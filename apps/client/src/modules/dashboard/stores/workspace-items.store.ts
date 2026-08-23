import type { StateCreator } from "zustand";

import {
  DEFAULT_DOCUMENT_FOLDER_COLOR,
  DEFAULT_DOCUMENT_FOLDER_ICON,
} from "@/modules/dashboard/document/model/document.types";
import type {
  DocumentFolderColor,
  DocumentFolderIcon,
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

export type WorkspaceItemsStoreState = {
  items: WorkspaceItem[];
  pendingContentByDocumentId: Record<string, string>;
  setItems: (items: WorkspaceItem[]) => void;
  toggleFolderExpanded: (folderId: string) => void;
  collapsedFolderIds: string[];
  createFolder: (
    name: string,
    parentId?: string | null,
    color?: DocumentFolderColor,
    icon?: DocumentFolderIcon,
  ) => string | null;
  renameFolder: (
    folderId: string,
    name: string,
    color: DocumentFolderColor,
    icon: DocumentFolderIcon,
  ) => void;
  deleteFolder: (folderId: string) => boolean;
  createDocument: (title?: string, parentId?: string | null) => string;
  renameDocument: (documentId: string, title: string) => void;
  moveDocument: (documentId: string, folderId: string | null) => void;
  moveFolder: (folderId: string, parentId: string | null) => boolean;
  toggleFavorite: (documentId: string) => void;
  deleteDocument: (documentId: string) => void;
  scheduleContentUpdate: (documentId: string, content: string) => void;
  flushPendingContent: (documentId: string) => void;
  flushAllPendingContent: () => void;
};

type WorkspaceItemsStoreOptions = {
  initialItems: WorkspaceItem[];
  maxMarkdownCharacters: number;
  onItemsChanged?: (
    previousItems: WorkspaceItem[],
    nextItems: WorkspaceItem[],
  ) => void | Promise<void>;
  onContentCommitted?: (
    documentId: string,
    content: string,
    document: WorkspaceDocumentItem,
  ) => void | Promise<void>;
};

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

export function isDocumentFolderColor(
  value: unknown,
): value is DocumentFolderColor {
  return ["primary", "blue", "violet", "amber", "rose", "emerald"].includes(
    value as DocumentFolderColor,
  );
}

export function isDocumentFolderIcon(
  value: unknown,
): value is DocumentFolderIcon {
  return [
    "folder",
    "briefcase",
    "book",
    "code",
    "lightbulb",
    "archive",
    "star",
    "target",
    "calendar",
    "image",
    "music",
    "heart",
    "users",
    "map",
    "key",
    "wrench",
  ].includes(value as DocumentFolderIcon);
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

export function createWorkspaceItemId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
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

  return (match[1] ?? "").replace(/[ \t]+#+[ \t]*$/, "").trim();
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

export function normalizeWorkspaceItems(items: WorkspaceItem[]) {
  return items.map((item) => {
    if (isWorkspaceFolder(item)) {
      return {
        ...item,
        color: isDocumentFolderColor(item.color)
          ? item.color
          : DEFAULT_DOCUMENT_FOLDER_COLOR,
        icon: isDocumentFolderIcon(item.icon)
          ? item.icon
          : DEFAULT_DOCUMENT_FOLDER_ICON,
      };
    }

    const normalized = normalizeMarkdownDocument(
      item.content,
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

function omitPendingContent(
  pendingContentByDocumentId: Record<string, string>,
  documentId: string,
) {
  const nextPendingContent = { ...pendingContentByDocumentId };
  delete nextPendingContent[documentId];
  return nextPendingContent;
}

export function createWorkspaceItemsState<T extends WorkspaceItemsStoreState>(
  options: WorkspaceItemsStoreOptions,
): StateCreator<T, [], [], WorkspaceItemsStoreState> {
  const pendingContentUpdates = new Map<string, PendingContentUpdate>();

  return (set, get) => {
    const updateItems = (nextItems: WorkspaceItem[]) => {
      const previousItems = get().items;
      set({ items: nextItems } as Partial<T>);
      void options.onItemsChanged?.(previousItems, nextItems);
    };

    const cancelPendingContentUpdate = (documentId: string) => {
      const pendingUpdate = pendingContentUpdates.get(documentId);

      if (!pendingUpdate) {
        return;
      }

      clearTimeout(pendingUpdate.timeoutId);
      pendingContentUpdates.delete(documentId);
    };

    const commitContent = (documentId: string, content: string) => {
      const document = get().items.find(
        (item): item is WorkspaceDocumentItem =>
          isWorkspaceDocument(item) && item.id === documentId,
      );
      const title = getFirstHeadingTitle(content) || UNTITLED_DOCUMENT_TITLE;

      if (
        !document ||
        (document.content === content && document.name === title)
      ) {
        set(
          (state) =>
            ({
              pendingContentByDocumentId: omitPendingContent(
                state.pendingContentByDocumentId,
                documentId,
              ),
            }) as Partial<T>,
        );
        return;
      }

      updateItems(
        get().items.map((item) =>
          isWorkspaceDocument(item) && item.id === documentId
            ? { ...item, content, name: title, updated_at: now() }
            : item,
        ),
      );
      set(
        (state) =>
          ({
            pendingContentByDocumentId: omitPendingContent(
              state.pendingContentByDocumentId,
              documentId,
            ),
          }) as Partial<T>,
      );
      const committedDocument = get().items.find(
        (item): item is WorkspaceDocumentItem =>
          isWorkspaceDocument(item) && item.id === documentId,
      );
      if (committedDocument) {
        void options.onContentCommitted?.(
          documentId,
          content,
          committedDocument,
        );
      }
    };

    return {
      items: normalizeWorkspaceItems(options.initialItems),
      pendingContentByDocumentId: {},
      collapsedFolderIds: [],

      setItems: updateItems,

      toggleFolderExpanded: (folderId) => {
        const isCollapsed = get().collapsedFolderIds.includes(folderId);
        set({
          collapsedFolderIds: isCollapsed
            ? get().collapsedFolderIds.filter((id) => id !== folderId)
            : [...get().collapsedFolderIds, folderId],
        } as Partial<T>);
      },

      createFolder: (
        rawName,
        parentId = null,
        color = DEFAULT_DOCUMENT_FOLDER_COLOR,
        icon = DEFAULT_DOCUMENT_FOLDER_ICON,
      ) => {
        const name = rawName.trim();

        if (
          !name ||
          (parentId &&
            !get().items.some(
              (item) => isWorkspaceFolder(item) && item.id === parentId,
            ))
        ) {
          return null;
        }

        const timestamp = now();
        const folder: WorkspaceFolderItem = {
          id: createWorkspaceItemId("folder"),
          type: "folder",
          parent_id: parentId,
          name,
          created_at: timestamp,
          updated_at: timestamp,
          color,
          icon,
        };

        updateItems([...get().items, folder]);
        return folder.id;
      },

      renameFolder: (folderId, rawName, color, icon) => {
        const name = rawName.trim();

        if (!name) {
          return;
        }

        updateItems(
          get().items.map((item) =>
            isWorkspaceFolder(item) && item.id === folderId
              ? { ...item, name, color, icon, updated_at: now() }
              : item,
          ),
        );
      },

      deleteFolder: (folderId) => {
        const folder = get().items.find(
          (item) => isWorkspaceFolder(item) && item.id === folderId,
        );

        if (!folder || folder.parent_id === null) {
          return false;
        }

        const folderIdsToDelete = getDescendantFolderIds(get().items, folderId);
        const timestamp = now();
        updateItems(
          get()
            .items.filter((item) => !folderIdsToDelete.has(item.id))
            .map((item) =>
              isWorkspaceDocument(item) &&
              item.parent_id !== null &&
              folderIdsToDelete.has(item.parent_id)
                ? { ...item, deleted_at: timestamp, updated_at: timestamp }
                : item,
            ),
        );
        set({
          collapsedFolderIds: get().collapsedFolderIds.filter(
            (id) => !folderIdsToDelete.has(id),
          ),
        } as Partial<T>);

        return true;
      },

      createDocument: (title, parentId = null) => {
        const trimmedTitle = title?.trim();
        const timestamp = now();
        const document: WorkspaceDocumentItem = {
          id: createWorkspaceItemId("document"),
          type: "document",
          parent_id: parentId,
          name: trimmedTitle || UNTITLED_DOCUMENT_TITLE,
          created_at: timestamp,
          updated_at: timestamp,
          content: createInitialMarkdown(trimmedTitle),
          group: "documents",
        };

        updateItems([...get().items, document]);
        return document.id;
      },

      renameDocument: (documentId, rawName) => {
        const name = rawName.trim();

        if (!name) {
          return;
        }

        updateItems(
          get().items.map((item) =>
            isWorkspaceDocument(item) && item.id === documentId
              ? { ...item, name, deleted_at: null, updated_at: now() }
              : item,
          ),
        );
      },

      moveDocument: (documentId, folderId) => {
        if (
          folderId &&
          !get().items.some(
            (item) => isWorkspaceFolder(item) && item.id === folderId,
          )
        ) {
          return;
        }

        updateItems(
          get().items.map((item) =>
            isWorkspaceDocument(item) && item.id === documentId
              ? { ...item, parent_id: folderId, updated_at: now() }
              : item,
          ),
        );
      },

      moveFolder: (folderId, parentId) => {
        const folder = get().items.find(
          (item) => isWorkspaceFolder(item) && item.id === folderId,
        );

        if (
          !folder ||
          folder.parent_id === null ||
          (parentId !== null &&
            !get().items.some(
              (item) => isWorkspaceFolder(item) && item.id === parentId,
            ))
        ) {
          return false;
        }

        const movedFolderIds = getDescendantFolderIds(get().items, folderId);

        if (
          parentId !== null &&
          (movedFolderIds.has(parentId) || folder.parent_id === parentId)
        ) {
          return false;
        }

        updateItems(
          get().items.map((item) =>
            isWorkspaceFolder(item) && item.id === folderId
              ? { ...item, parent_id: parentId, updated_at: now() }
              : item,
          ),
        );

        return true;
      },

      toggleFavorite: (documentId) => {
        updateItems(
          get().items.map((item) =>
            isWorkspaceDocument(item) && item.id === documentId
              ? { ...item, favorite: !item.favorite, updated_at: now() }
              : item,
          ),
        );
      },

      deleteDocument: (documentId) => {
        const timestamp = now();
        updateItems(
          get().items.map((item) =>
            isWorkspaceDocument(item) && item.id === documentId
              ? { ...item, deleted_at: timestamp, updated_at: timestamp }
              : item,
          ),
        );
      },

      scheduleContentUpdate: (documentId, content) => {
        const document = get().items.find(
          (item): item is WorkspaceDocumentItem =>
            isWorkspaceDocument(item) && item.id === documentId,
        );

        if (!document) {
          return;
        }

        const limitedContent = normalizeMarkdownDocument(
          content,
          options.maxMarkdownCharacters,
        ).content;

        if (document.content === limitedContent) {
          cancelPendingContentUpdate(documentId);
          set(
            (state) =>
              ({
                pendingContentByDocumentId: omitPendingContent(
                  state.pendingContentByDocumentId,
                  documentId,
                ),
              }) as Partial<T>,
          );
          return;
        }

        cancelPendingContentUpdate(documentId);
        set(
          (state) =>
            ({
              pendingContentByDocumentId: {
                ...state.pendingContentByDocumentId,
                [documentId]: limitedContent,
              },
            }) as Partial<T>,
        );

        const timeoutId = setTimeout(() => {
          const pendingUpdate = pendingContentUpdates.get(documentId);

          if (!pendingUpdate || pendingUpdate.timeoutId !== timeoutId) {
            return;
          }

          pendingContentUpdates.delete(documentId);
          commitContent(documentId, pendingUpdate.content);
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
        commitContent(documentId, pendingUpdate.content);
      },

      flushAllPendingContent: () => {
        [...pendingContentUpdates.keys()].forEach((documentId) => {
          get().flushPendingContent(documentId);
        });
      },
    };
  };
}
