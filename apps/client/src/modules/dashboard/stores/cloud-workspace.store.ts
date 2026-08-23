import { create } from "zustand";

import {
  DEFAULT_DOCUMENT_FOLDER_COLOR,
  DEFAULT_DOCUMENT_FOLDER_ICON,
  type DocumentFolderColor,
  type DocumentFolderIcon,
  type WorkspaceDocumentItem,
  type WorkspaceFolderItem,
  type WorkspaceItem,
} from "@/modules/dashboard/document/model/document.types";
import {
  downloadWorkspaceDocument,
  toWorkspaceApiError,
  uploadWorkspaceDocument,
  workspaceApi,
  WorkspaceApiError,
  type WorkspaceApiItem,
} from "../services/workspace-api";

import {
  CLOUD_DOCUMENT_CONTENT_DEBOUNCE_MS,
  MAX_MARKDOWN_CHARACTERS,
  createInitialMarkdown,
  createWorkspaceItemsState,
  isDocumentFolderColor,
  isDocumentFolderIcon,
  isWorkspaceDocument,
  isWorkspaceFolder,
  normalizeMarkdownDocument,
  type WorkspaceItemsStoreState,
} from "./workspace-items.store";

export type CloudWorkspaceOperation =
  | "hydrate"
  | "metadata"
  | "transfer"
  | "copy";

type CloudWorkspaceStoreState = WorkspaceItemsStoreState & {
  isHydrated: boolean;
  isHydrating: boolean;
  userId: string | null;
  operation: CloudWorkspaceOperation | null;
  error: ReturnType<typeof toWorkspaceApiError> | null;
  isSaving: boolean;
  savingDocumentIds: Record<string, boolean>;
  contentLoadedByDocumentId: Record<string, boolean>;
  contentLoadingByDocumentId: Record<string, boolean>;
  contentErrorByDocumentId: Record<string, string | null>;
  hydrate: (userId?: string) => Promise<void>;
  reset: () => void;
  loadDocumentContent: (documentId: string) => Promise<void>;
  flushPendingContentAndSave: (documentId: string) => Promise<void>;
  flushAllPendingContentAndSave: () => Promise<void>;
  saveDocumentContent: (
    documentId: string,
    content: string,
    document?: WorkspaceDocumentItem,
  ) => Promise<void>;
  createFolderRemote: (
    name: string,
    parentId: string | null,
    color: DocumentFolderColor,
    icon: DocumentFolderIcon,
  ) => Promise<string | null>;
  renameFolderRemote: (
    folderId: string,
    name: string,
    color: DocumentFolderColor,
    icon: DocumentFolderIcon,
  ) => Promise<void>;
  deleteFolderRemote: (folderId: string) => Promise<boolean>;
  createDocumentRemote: (
    title: string | undefined,
    parentId: string | null,
  ) => Promise<string | null>;
  renameDocumentRemote: (documentId: string, title: string) => Promise<void>;
  moveDocumentRemote: (
    documentId: string,
    folderId: string | null,
  ) => Promise<void>;
  moveFolderRemote: (
    folderId: string,
    parentId: string | null,
  ) => Promise<boolean>;
  toggleFavoriteRemote: (documentId: string) => Promise<void>;
  deleteDocumentRemote: (documentId: string) => Promise<boolean>;
  setCloudOperation: (operation: CloudWorkspaceOperation | null) => void;
  setCloudError: (error: ReturnType<typeof toWorkspaceApiError> | null) => void;
};

export function mapCloudWorkspaceItem(
  item: WorkspaceApiItem,
  content?: string,
): WorkspaceItem {
  const common = {
    id: item.id,
    parent_id: item.parentId,
    name: item.name,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };

  if (item.type === "folder") {
    return {
      ...common,
      type: "folder",
      color: isDocumentFolderColor(item.color)
        ? item.color
        : DEFAULT_DOCUMENT_FOLDER_COLOR,
      icon: isDocumentFolderIcon(item.icon)
        ? item.icon
        : DEFAULT_DOCUMENT_FOLDER_ICON,
    } satisfies WorkspaceFolderItem;
  }

  return {
    ...common,
    type: "document",
    group: "documents",
    content: content ?? createInitialMarkdown(item.name),
    favorite: item.favorite,
    content_revision: item.contentRevision,
    content_type: item.contentType ?? null,
    size_bytes: item.sizeBytes ?? null,
    storage_status: item.storageStatus ?? null,
    sort_order: item.sortOrder,
    deleted_at: item.deletedAt ?? null,
  } satisfies WorkspaceDocumentItem;
}

function getFolderSubtreeIds(items: WorkspaceItem[], folderId: string) {
  const folderIds = new Set<string>();
  const collect = (currentId: string) => {
    folderIds.add(currentId);
    items
      .filter(
        (item) => isWorkspaceFolder(item) && item.parent_id === currentId,
      )
      .forEach((item) => collect(item.id));
  };

  collect(folderId);
  return new Set(
    items
      .filter(
        (item) =>
          folderIds.has(item.id) ||
          (isWorkspaceDocument(item) &&
            item.parent_id !== null &&
            folderIds.has(item.parent_id)),
      )
      .map((item) => item.id),
  );
}

export const useCloudWorkspaceStore = create<CloudWorkspaceStoreState>(
  (set, get, api) => {
    const contentSaveQueues = new Map<string, Promise<void>>();
    let hydrationGeneration = 0;

    const setSaving = (documentId: string, saving: boolean) => {
      set((state) => {
        const savingDocumentIds = { ...state.savingDocumentIds };
        if (saving) {
          savingDocumentIds[documentId] = true;
        } else {
          delete savingDocumentIds[documentId];
        }

        return {
          savingDocumentIds,
          isSaving: Object.keys(savingDocumentIds).length > 0,
        };
      });
    };

    const replaceApiItem = (apiItem: WorkspaceApiItem, content?: string) => {
      const existing = get().items.find((item) => item.id === apiItem.id);
      const currentContent =
        content ??
        (existing && isWorkspaceDocument(existing) ? existing.content : undefined);
      const nextItem = mapCloudWorkspaceItem(apiItem, currentContent);

      set((state) => ({
        items: state.items.some((item) => item.id === nextItem.id)
          ? state.items.map((item) =>
              item.id === nextItem.id ? nextItem : item,
            )
          : [...state.items, nextItem],
      }));
    };

    const saveDocumentContent = (
      documentId: string,
      content: string,
      document = get().items.find(
        (item): item is WorkspaceDocumentItem =>
          isWorkspaceDocument(item) && item.id === documentId,
      ),
    ) => {
      if (!document) {
        return Promise.reject(
          new WorkspaceApiError("Cloud document was not found.", 404),
        );
      }

      const saveUserId = get().userId;
      const saveGeneration = hydrationGeneration;
      const previous = contentSaveQueues.get(documentId) ?? Promise.resolve();
      const next = previous
        .catch(() => undefined)
        .then(async () => {
          set({ error: null });
          setSaving(documentId, true);

          try {
            const latestDocument = get().items.find(
              (item): item is WorkspaceDocumentItem =>
                isWorkspaceDocument(item) && item.id === documentId,
            );
            const savedItem = await uploadWorkspaceDocument(
              {
                ...document,
                content_revision:
                  latestDocument?.content_revision ?? document.content_revision,
              },
              content,
            );
            const persistedItem =
              savedItem.name !== document.name ||
              savedItem.parentId !== document.parent_id ||
              savedItem.favorite !== document.favorite
                ? await workspaceApi.updateItem(savedItem.id, {
                    name: document.name,
                    parentId: document.parent_id,
                    favorite: document.favorite === true,
                    sortOrder: document.sort_order ?? 0,
                  })
                : savedItem;

            if (
              saveGeneration !== hydrationGeneration ||
              (saveUserId && get().userId !== saveUserId)
            ) {
              return;
            }

            replaceApiItem(persistedItem, content);
          } catch (error) {
            const apiError = toWorkspaceApiError(error);
            if (
              saveGeneration === hydrationGeneration &&
              (!saveUserId || get().userId === saveUserId)
            ) {
              set({ error: apiError });
            }
            throw apiError;
          } finally {
            if (saveGeneration === hydrationGeneration) {
              setSaving(documentId, false);
            }
          }
      });

      contentSaveQueues.set(documentId, next);
      void next.then(
        () => {
          if (contentSaveQueues.get(documentId) === next) {
            contentSaveQueues.delete(documentId);
          }
        },
        () => {
          if (contentSaveQueues.get(documentId) === next) {
            contentSaveQueues.delete(documentId);
          }
        },
      );
      return next;
    };

    const runMetadata = async <T>(task: () => Promise<T>, fallback: T) => {
      if (get().operation || get().isHydrating) {
        return fallback;
      }

      set({ operation: "metadata", error: null });

      try {
        return await task();
      } catch (error) {
        const apiError = toWorkspaceApiError(error);
        set({ error: apiError });
        throw apiError;
      } finally {
        set({ operation: null });
      }
    };

    const updateRemoteItem = async (
      item: WorkspaceItem,
      changes: Partial<{
        name: string;
        parentId: string | null;
        color: DocumentFolderColor;
        icon: DocumentFolderIcon;
        favorite: boolean;
      }>,
    ) => {
      const updated = await workspaceApi.updateItem(item.id, {
        name: changes.name ?? item.name,
        parentId:
          changes.parentId !== undefined ? changes.parentId : item.parent_id,
        ...(isWorkspaceFolder(item)
          ? {
              color: changes.color ?? item.color,
              icon: changes.icon ?? item.icon,
            }
          : {}),
        favorite:
          isWorkspaceDocument(item)
            ? changes.favorite ?? item.favorite === true
            : false,
        sortOrder: isWorkspaceDocument(item) ? item.sort_order ?? 0 : 0,
      });
      replaceApiItem(updated);
    };

    const baseState = createWorkspaceItemsState<CloudWorkspaceStoreState>({
      initialItems: [],
      maxMarkdownCharacters: MAX_MARKDOWN_CHARACTERS,
      contentDebounceMs: CLOUD_DOCUMENT_CONTENT_DEBOUNCE_MS,
      onContentCommitted: (documentId, content, document) =>
        get().isHydrated
          ? saveDocumentContent(documentId, content, document).catch(
              () => undefined,
            )
          : undefined,
    })(set, get, api);

    return {
      ...baseState,
      isHydrated: false,
      isHydrating: false,
      userId: null,
      operation: null,
      error: null,
      isSaving: false,
      savingDocumentIds: {},
      contentLoadedByDocumentId: {},
      contentLoadingByDocumentId: {},
      contentErrorByDocumentId: {},

      hydrate: async (userId) => {
        if (
          get().isHydrating ||
          (get().isHydrated && (!userId || get().userId === userId))
        ) {
          return;
        }

        const generation = ++hydrationGeneration;
        set({ isHydrating: true, operation: "hydrate", error: null });
        if (userId) {
          set({ userId });
        }

        try {
          const apiItems = await workspaceApi.listItems();
          if (generation !== hydrationGeneration) {
            return;
          }

          const items = apiItems.map((item) => mapCloudWorkspaceItem(item));
          const loadedDocuments = Object.fromEntries(
            apiItems
              .filter((item) => item.type === "document")
              .map((item) => [item.id, false]),
          );

          set({
            items,
            pendingContentByDocumentId: {},
            contentLoadedByDocumentId: loadedDocuments,
            contentLoadingByDocumentId: {},
            contentErrorByDocumentId: {},
            isHydrated: true,
            userId: userId ?? get().userId,
          });
        } catch (error) {
          if (generation !== hydrationGeneration) {
            return;
          }

          set({ error: toWorkspaceApiError(error), isHydrated: false });
        } finally {
          if (generation === hydrationGeneration) {
            set({ isHydrating: false, operation: null });
          }
        }
      },

      reset: () => {
        hydrationGeneration += 1;
        set({
          items: [],
          pendingContentByDocumentId: {},
          collapsedFolderIds: [],
          isHydrated: false,
          isHydrating: false,
          userId: null,
          operation: null,
          error: null,
          isSaving: false,
          savingDocumentIds: {},
          contentLoadedByDocumentId: {},
          contentLoadingByDocumentId: {},
          contentErrorByDocumentId: {},
        });
      },

      loadDocumentContent: async (documentId) => {
        if (
          get().contentLoadedByDocumentId[documentId] ||
          get().contentLoadingByDocumentId[documentId]
        ) {
          return;
        }

        const loadUserId = get().userId;
        const loadGeneration = hydrationGeneration;
        set((state) => ({
          contentLoadingByDocumentId: {
            ...state.contentLoadingByDocumentId,
            [documentId]: true,
          },
          contentErrorByDocumentId: {
            ...state.contentErrorByDocumentId,
            [documentId]: null,
          },
        }));

        try {
          const content = normalizeMarkdownDocument(
            await downloadWorkspaceDocument(documentId),
            MAX_MARKDOWN_CHARACTERS,
          ).content;

          if (
            loadGeneration !== hydrationGeneration ||
            (loadUserId && get().userId !== loadUserId)
          ) {
            return;
          }

          set((state) => ({
            items: state.items.map((item) =>
              isWorkspaceDocument(item) && item.id === documentId
                ? { ...item, content }
                : item,
            ),
            contentLoadedByDocumentId: {
              ...state.contentLoadedByDocumentId,
              [documentId]: true,
            },
          }));
        } catch (error) {
          const apiError = toWorkspaceApiError(error);
          if (
            loadGeneration === hydrationGeneration &&
            (!loadUserId || get().userId === loadUserId)
          ) {
            set((state) => ({
              error: apiError,
              contentErrorByDocumentId: {
                ...state.contentErrorByDocumentId,
                [documentId]: apiError.message,
              },
            }));
          }
          throw apiError;
        } finally {
          if (loadGeneration === hydrationGeneration) {
            set((state) => ({
              contentLoadingByDocumentId: {
                ...state.contentLoadingByDocumentId,
                [documentId]: false,
              },
            }));
          }
        }
      },

      flushPendingContentAndSave: async (documentId) => {
        get().flushPendingContent(documentId);
        await contentSaveQueues.get(documentId);
      },

      flushAllPendingContentAndSave: async () => {
        get().flushAllPendingContent();
        await Promise.all([...contentSaveQueues.values()]);
      },

      saveDocumentContent,

      createFolderRemote: async (name, parentId, color, icon) =>
        runMetadata(
          async () => {
            const created = await workspaceApi.createItem({
              parentId,
              name: name.trim(),
              type: "folder",
              color,
              icon,
            });
            replaceApiItem(created);
            return created.id;
          },
          null,
        ),

      renameFolderRemote: async (folderId, name, color, icon) => {
        const folder = get().items.find(
          (item): item is WorkspaceFolderItem =>
            isWorkspaceFolder(item) && item.id === folderId,
        );
        if (!folder) {
          return;
        }
        await runMetadata(
          () => updateRemoteItem(folder, { name: name.trim(), color, icon }),
          undefined,
        );
      },

      deleteFolderRemote: async (folderId) =>
        runMetadata(
          async () => {
            await workspaceApi.deleteItem(folderId);
            const deletedIds = getFolderSubtreeIds(get().items, folderId);
            set((state) => ({
              items: state.items.filter((item) => !deletedIds.has(item.id)),
              collapsedFolderIds: state.collapsedFolderIds.filter(
                (id) => !deletedIds.has(id),
              ),
            }));
            return true;
          },
          false,
        ),

      createDocumentRemote: async (title, parentId) =>
        runMetadata(
          async () => {
            const trimmedTitle = title?.trim();
            const created = await workspaceApi.createItem({
              parentId,
              name: trimmedTitle || "Untitled",
              type: "document",
            });
            const document = mapCloudWorkspaceItem(
              created,
              createInitialMarkdown(trimmedTitle),
            );
            if (!isWorkspaceDocument(document)) {
              return null;
            }
            replaceApiItem(created, document.content);
            set((state) => ({
              contentLoadedByDocumentId: {
                ...state.contentLoadedByDocumentId,
                [created.id]: true,
              },
            }));

            try {
              await saveDocumentContent(created.id, document.content, document);
            } catch (error) {
              try {
                await workspaceApi.deleteItem(created.id);
              } catch (cleanupError) {
                console.error(
                  "[CloudWorkspaceStore] failed to clean up document after upload failure:",
                  cleanupError,
                );
              }
              set((state) => ({
                items: state.items.filter((item) => item.id !== created.id),
              }));
              throw error;
            }

            return created.id;
          },
          null,
        ),

      renameDocumentRemote: async (documentId, title) => {
        const document = get().items.find(
          (item): item is WorkspaceDocumentItem =>
            isWorkspaceDocument(item) && item.id === documentId,
        );
        if (!document || !title.trim()) {
          return;
        }
        await runMetadata(
          () => updateRemoteItem(document, { name: title.trim() }),
          undefined,
        );
      },

      moveDocumentRemote: async (documentId, folderId) => {
        const document = get().items.find(
          (item): item is WorkspaceDocumentItem =>
            isWorkspaceDocument(item) && item.id === documentId,
        );
        if (!document) {
          return;
        }
        await runMetadata(
          () => updateRemoteItem(document, { parentId: folderId }),
          undefined,
        );
      },

      moveFolderRemote: async (folderId, parentId) => {
        const folder = get().items.find(
          (item): item is WorkspaceFolderItem =>
            isWorkspaceFolder(item) && item.id === folderId,
        );
        if (!folder || parentId === folderId) {
          return false;
        }
        await runMetadata(
          () => updateRemoteItem(folder, { parentId }),
          undefined,
        );
        return true;
      },

      toggleFavoriteRemote: async (documentId) => {
        const document = get().items.find(
          (item): item is WorkspaceDocumentItem =>
            isWorkspaceDocument(item) && item.id === documentId,
        );
        if (!document) {
          return;
        }
        await runMetadata(
          () =>
            updateRemoteItem(document, {
              favorite: document.favorite !== true,
            }),
          undefined,
        );
      },

      deleteDocumentRemote: async (documentId) =>
        runMetadata(
          async () => {
            await workspaceApi.deleteItem(documentId);
            set((state) => ({
              items: state.items.filter((item) => item.id !== documentId),
            }));
            return true;
          },
          false,
        ),

      setCloudOperation: (operation) => set({ operation }),
      setCloudError: (error) => set({ error }),
    };
  },
);

export type { CloudWorkspaceStoreState };
