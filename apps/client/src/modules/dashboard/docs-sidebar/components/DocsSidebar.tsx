"use client";

import {
  FilePlus2,
  FileText,
  Folder,
  LibraryBig,
  Loader2,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useState } from "react";

import { Link } from "@/core/i18n";
import { authClient } from "@/lib/auth-client";
import type {
  DocumentFolderColor,
  DocumentFolderIcon,
  DocumentSource,
  WorkspaceDocumentItem,
  WorkspaceFolderItem,
} from "@/modules/dashboard/document/model/document.types";
import {
  isWorkspaceDocument,
  isWorkspaceFolder,
  useWorkspaceClipboardStore,
  useCloudWorkspaceStore,
  useLocalWorkspaceStore,
  useWorkspaceSessionStore,
} from "@/modules/dashboard/stores";
import {
  copyWorkspaceItemBetweenSources,
  transferWorkspaceItemBetweenSources,
} from "@/modules/dashboard/stores/workspace-transfer";
import { AuthActions } from "@/modules/navigation/components/AuthActions";

import { DocumentSourceToggle } from "./DocumentSourceToggle";
import { FolderTree } from "./FolderTree";
import {
  useLongPressDrag,
  type LongPressDragItem,
  type LongPressDragPosition,
  type LongPressDragPreviewPhase,
} from "./longPressDrag";
import {
  DeleteFolderDialog,
  FolderActionsDialog,
  FolderEditorDialog,
  MarkdownNameDialog,
} from "./modals";

type FolderDialogState = {
  mode: "create" | "edit";
  source: "local" | "cloud";
  folderId?: string;
  parentId: string | null;
  name: string;
  color: DocumentFolderColor;
  icon: DocumentFolderIcon;
};

type FolderActionsState = {
  source: DocumentSource;
  folder: WorkspaceFolderItem;
  createParentId: string | null;
  isVirtualRoot: boolean;
};

type MarkdownDialogState = {
  source: DocumentSource;
  parentId: string | null;
  parentName: string;
  name: string;
};

type DeleteFolderDialogState = {
  source: DocumentSource;
  folder: WorkspaceFolderItem;
};

function DragPreview({
  item,
  label,
  position,
  phase,
}: {
  item: LongPressDragItem;
  label: string;
  position: LongPressDragPosition;
  phase: LongPressDragPreviewPhase;
}) {
  const Icon = item.kind === "folder" ? Folder : FileText;

  return (
    <div
      aria-hidden="true"
      className={`docs-sidebar-dnd-preview-anchor docs-sidebar-dnd-preview-anchor-${phase} pointer-events-none fixed z-[100] w-max max-w-60`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div
        className={`docs-sidebar-dnd-preview docs-sidebar-dnd-preview-${phase} flex max-w-60 items-center gap-2 rounded-lg border border-primary/30 bg-background/85 px-3 py-2 text-sm text-foreground shadow-lg backdrop-blur-sm`}
      >
        <Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.7} />
        <span className="min-w-0 truncate">{label}</span>
      </div>
    </div>
  );
}

function getAncestorFolderIds(
  items: Array<{ id: string; parent_id: string | null }>,
  parentId: string | null,
) {
  const ancestors = new Set<string>();
  let currentId = parentId;

  while (currentId) {
    ancestors.add(currentId);
    currentId =
      items.find((item) => item.id === currentId)?.parent_id ?? null;
  }

  return ancestors;
}

export function DocsSidebar({
  selectedId,
  onSelect,
  onDelete,
  onOpenSettings,
  mobile = false,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpenSettings?: () => void;
  mobile?: boolean;
}) {
  const locale = useLocale();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [folderDialog, setFolderDialog] = useState<FolderDialogState | null>(
    null,
  );
  const [folderActions, setFolderActions] = useState<FolderActionsState | null>(
    null,
  );
  const [markdownDialog, setMarkdownDialog] =
    useState<MarkdownDialogState | null>(null);
  const [deleteFolderDialog, setDeleteFolderDialog] =
    useState<DeleteFolderDialogState | null>(null);
  const [dragPreviewSource, setDragPreviewSource] =
    useState<DocumentSource | null>(null);
  const [cloudDropBlocked, setCloudDropBlocked] = useState(false);
  const activeSource = useWorkspaceSessionStore((state) => state.activeSource);
  const selectedDocumentId = useWorkspaceSessionStore(
    (state) => state.selectedDocumentId,
  );
  const selectedDocumentSource = useWorkspaceSessionStore(
    (state) => state.selectedDocumentSource,
  );
  const clipboardItem = useWorkspaceClipboardStore((state) => state.item);
  const setClipboardItem = useWorkspaceClipboardStore((state) => state.setItem);
  const selectDocumentInSession = useWorkspaceSessionStore(
    (state) => state.selectDocument,
  );
  const setActiveSourceInSession = useWorkspaceSessionStore(
    (state) => state.setActiveSource,
  );
  const localItems = useLocalWorkspaceStore((state) => state.items);
  const cloudItems = useCloudWorkspaceStore((state) => state.items);
  const hydrateCloudWorkspace = useCloudWorkspaceStore(
    (state) => state.hydrate,
  );
  const cloudIsHydrated = useCloudWorkspaceStore((state) => state.isHydrated);
  const cloudIsHydrating = useCloudWorkspaceStore(
    (state) => state.isHydrating,
  );
  const cloudOperation = useCloudWorkspaceStore((state) => state.operation);
  const cloudError = useCloudWorkspaceStore((state) => state.error);
  const cloudIsSaving = useCloudWorkspaceStore((state) => state.isSaving);
  const localCollapsedFolderIds = useLocalWorkspaceStore(
    (state) => state.collapsedFolderIds,
  );
  const cloudCollapsedFolderIds = useCloudWorkspaceStore(
    (state) => state.collapsedFolderIds,
  );
  const toggleLocalFolderExpanded = useLocalWorkspaceStore(
    (state) => state.toggleFolderExpanded,
  );
  const toggleCloudFolderExpanded = useCloudWorkspaceStore(
    (state) => state.toggleFolderExpanded,
  );
  const createLocalFolder = useLocalWorkspaceStore(
    (state) => state.createFolder,
  );
  const createCloudFolder = useCloudWorkspaceStore(
    (state) => state.createFolderRemote,
  );
  const renameLocalFolder = useLocalWorkspaceStore(
    (state) => state.renameFolder,
  );
  const renameCloudFolder = useCloudWorkspaceStore(
    (state) => state.renameFolderRemote,
  );
  const deleteLocalFolder = useLocalWorkspaceStore(
    (state) => state.deleteFolder,
  );
  const deleteCloudFolder = useCloudWorkspaceStore(
    (state) => state.deleteFolderRemote,
  );
  const createLocalDocument = useLocalWorkspaceStore(
    (state) => state.createDocument,
  );
  const createCloudDocument = useCloudWorkspaceStore(
    (state) => state.createDocumentRemote,
  );
  const renameLocalDocument = useLocalWorkspaceStore(
    (state) => state.renameDocument,
  );
  const renameCloudDocument = useCloudWorkspaceStore(
    (state) => state.renameDocumentRemote,
  );
  const moveLocalDocument = useLocalWorkspaceStore(
    (state) => state.moveDocument,
  );
  const moveCloudDocument = useCloudWorkspaceStore(
    (state) => state.moveDocumentRemote,
  );
  const moveLocalFolder = useLocalWorkspaceStore((state) => state.moveFolder);
  const moveCloudFolder = useCloudWorkspaceStore(
    (state) => state.moveFolderRemote,
  );
  const toggleLocalFavorite = useLocalWorkspaceStore(
    (state) => state.toggleFavorite,
  );
  const toggleCloudFavorite = useCloudWorkspaceStore(
    (state) => state.toggleFavoriteRemote,
  );
  const deleteLocalDocument = useLocalWorkspaceStore(
    (state) => state.deleteDocument,
  );
  const deleteCloudDocument = useCloudWorkspaceStore(
    (state) => state.deleteDocumentRemote,
  );
  const flushLocalPendingContent = useLocalWorkspaceStore(
    (state) => state.flushPendingContent,
  );
  const flushCloudPendingContent = useCloudWorkspaceStore(
    (state) => state.flushPendingContent,
  );
  const setActiveSource = (source: DocumentSource) => {
    if (
      source === activeSource ||
      (activeSource === "cloud" && cloudIsHydrating) ||
      cloudOperation !== null
    ) {
      return;
    }

    if (selectedDocumentId) {
      ((selectedDocumentSource ?? activeSource) === "local"
        ? flushLocalPendingContent
        : flushCloudPendingContent)(selectedDocumentId);
    }

    setActiveSourceInSession(source);
  };
  const createFolder = (
    source: DocumentSource,
    name: string,
    parentId: string | null,
    color: DocumentFolderColor,
    icon: DocumentFolderIcon,
  ) =>
    source === "local"
      ? Promise.resolve(createLocalFolder(name, parentId, color, icon))
      : createCloudFolder(name, parentId, color, icon);
  const renameFolder = (
    source: DocumentSource,
    folderId: string,
    name: string,
    color: DocumentFolderColor,
    icon: DocumentFolderIcon,
  ) =>
    source === "local"
      ? Promise.resolve(renameLocalFolder(folderId, name, color, icon))
      : renameCloudFolder(folderId, name, color, icon);
  const deleteFolder = (source: DocumentSource, folderId: string) =>
    source === "local"
      ? Promise.resolve(deleteLocalFolder(folderId))
      : deleteCloudFolder(folderId);
  const createDocument = (
    source: DocumentSource,
    title: string | undefined,
    parentId: string | null,
  ) =>
    source === "local"
      ? Promise.resolve(createLocalDocument(title, parentId ?? undefined))
      : createCloudDocument(title, parentId);
  const renameDocument = (
    source: DocumentSource,
    documentId: string,
    title: string,
  ) =>
    source === "local"
      ? Promise.resolve(renameLocalDocument(documentId, title))
      : renameCloudDocument(documentId, title);
  const moveDocument = (
    source: DocumentSource,
    documentId: string,
    folderId: string | null,
  ) =>
    source === "local"
      ? Promise.resolve(moveLocalDocument(documentId, folderId))
      : moveCloudDocument(documentId, folderId);
  const moveFolder = (
    source: DocumentSource,
    folderId: string,
    parentId: string | null,
  ) =>
    source === "local"
      ? Promise.resolve(moveLocalFolder(folderId, parentId))
      : moveCloudFolder(folderId, parentId);
  const copyItem = (source: DocumentSource, itemId: string) => {
    const item = (source === "local" ? localItems : cloudItems).find(
      (candidate) => candidate.id === itemId,
    );

    if (!item) {
      return;
    }

    setClipboardItem({
      id: item.id,
      source,
      kind: isWorkspaceFolder(item) ? "folder" : "document",
    });
  };
  const canPasteInto = (destination: DocumentSource) =>
    clipboardItem !== null &&
    !cloudBusy &&
    (destination !== "cloud" || canUseCloud) &&
    (clipboardItem.source !== "cloud" || canUseCloud);
  const pasteItem = (
    destination: DocumentSource,
    destinationParentId: string | null,
  ) => {
    if (!clipboardItem || !canPasteInto(destination)) {
      return;
    }

    void copyWorkspaceItemBetweenSources({
      itemId: clipboardItem.id,
      source: clipboardItem.source,
      destination,
      destinationParentId,
    });
  };
  const toggleFavorite = (source: DocumentSource, documentId: string) =>
    source === "local"
      ? Promise.resolve(toggleLocalFavorite(documentId))
      : toggleCloudFavorite(documentId);
  const deleteDocument = (source: DocumentSource, documentId: string) =>
    source === "local"
      ? Promise.resolve(deleteLocalDocument(documentId)).then(() => true)
      : deleteCloudDocument(documentId);
  const toggleFolderExpanded = (source: DocumentSource, folderId: string) =>
    (source === "local"
      ? toggleLocalFolderExpanded
      : toggleCloudFolderExpanded)(folderId);
  const displaySource = dragPreviewSource ?? activeSource;
  const canUseCloud = !sessionPending && Boolean(session?.user);
  const isCloudUnauthenticated = displaySource === "cloud" && !canUseCloud;
  const cloudBusy =
    cloudIsHydrating ||
    cloudOperation !== null ||
    cloudIsSaving;
  const cloudStatusVisible =
    canUseCloud &&
    (displaySource === "cloud" || cloudError !== null) &&
    (cloudIsHydrating ||
      (!cloudIsHydrated && !cloudError) ||
      cloudOperation !== null ||
      cloudIsSaving ||
      cloudError !== null);
  const sourceItems = displaySource === "local" ? localItems : cloudItems;
  const sourceDocuments = sourceItems.filter(
    (item): item is WorkspaceDocumentItem =>
      isWorkspaceDocument(item) && !item.deleted_at,
  );
  const sourceFolders = sourceItems.filter(isWorkspaceFolder);
  const collapsedFolderIds =
    displaySource === "local"
      ? localCollapsedFolderIds
      : cloudCollapsedFolderIds;
  const rootFolderId =
    displaySource === "local"
      ? sourceFolders.find((folder) => folder.parent_id === null)?.id
      : null;
  const {
    draggingItem,
    dragPosition,
    dragPreviewItem,
    dragPreviewPhase,
    dropTarget,
    dropTargetFolderId,
    startLongPress,
    suppressClick,
  } = useLongPressDrag({
    onDrop: (item, target) => {
      if (!item.source || (target.source === "cloud" && !canUseCloud)) {
        return false;
      }

      const destinationItems =
        target.source === "local"
          ? useLocalWorkspaceStore.getState().items
          : useCloudWorkspaceStore.getState().items;
      const destinationParentId =
        target.kind === "folder"
          ? target.folderId
          : target.source === "local"
            ? destinationItems.find(
                (candidate) =>
                  isWorkspaceFolder(candidate) && candidate.parent_id === null,
              )?.id
            : null;

      const resolvedDestinationParentId = destinationParentId ?? null;

      if (item.source === target.source) {
        if (item.kind === "folder") {
          void moveFolder(
            item.source,
            item.id,
            resolvedDestinationParentId,
          ).catch(() => undefined);
        } else {
          void moveDocument(
            item.source,
            item.id,
            resolvedDestinationParentId,
          ).catch(() => undefined);
        }
        return true;
      }

      void transferWorkspaceItemBetweenSources({
        itemId: item.id,
        source: item.source,
        destination: target.source,
        destinationParentId: resolvedDestinationParentId,
      }).then((transferredItemId) => {
        if (transferredItemId) {
          if (item.kind === "document" && selectedDocumentId === item.id) {
            selectDocumentInSession(transferredItemId, target.source);
          }

          setActiveSourceInSession(target.source);
        }
      });

      return true;
    },
    onTargetChange: (_item, target) => {
      if (target?.source === "cloud" && !canUseCloud) {
        setCloudDropBlocked(true);
        setDragPreviewSource("cloud");
        return;
      }

      setCloudDropBlocked(false);
      if (target) {
        setDragPreviewSource(target.source);
      }
    },
    onDragEnd: () => {
      setCloudDropBlocked(false);
      setDragPreviewSource(null);
    },
  });
  const rootDropActive = Boolean(
    dropTarget &&
      (dropTarget.kind === "root" || dropTarget.kind === "source-toggle") &&
      dropTarget.source === displaySource &&
      (dropTarget.source !== "cloud" || canUseCloud),
  );

  const handleDelete = (id: string) => {
    if (sourceDocuments.length <= 1) {
      return;
    }

    void deleteDocument(displaySource, id)
      .then((deleted) => {
        if (deleted) {
          onDelete?.(id);
        }
      })
      .catch(() => undefined);
  };

  const handleCreateDocument = (
    folderId: string | null,
    source: DocumentSource = displaySource,
  ) => {
    const sourceItems = source === "local" ? localItems : cloudItems;
    const parentName =
      sourceItems.find(
        (item): item is WorkspaceFolderItem =>
           isWorkspaceFolder(item) && folderId !== null && item.id === folderId,
      )?.name ?? "Workspace";

    setMarkdownDialog({
      source,
      parentId: folderId,
      parentName,
      name: "",
    });
  };

  const handleCreateRootDocument = () => {
    handleCreateDocument(rootFolderId ?? null);
  };

  const handleCreateFolder = (
    parentId: string | null,
    source: DocumentSource = displaySource,
  ) => {
    setFolderDialog({
      mode: "create",
      source,
      parentId,
      name: "",
      color: "primary",
      icon: "folder",
    });
  };

  const handleOpenFolderActions = (
    folder: WorkspaceFolderItem,
    createParentId: string | null = folder.id,
  ) => {
    setFolderActions({
      source: displaySource,
      folder,
      createParentId,
      isVirtualRoot: createParentId === null && displaySource === "cloud",
    });
  };

  const handleCopyFromActions = () => {
    if (!folderActions || folderActions.isVirtualRoot) {
      return;
    }

    copyItem(folderActions.source, folderActions.folder.id);
    setFolderActions(null);
  };

  const handlePasteFromActions = () => {
    if (!folderActions) {
      return;
    }

    const { source, createParentId } = folderActions;
    setFolderActions(null);
    pasteItem(source, createParentId);
  };

  const handleNewFolderFromActions = () => {
    if (!folderActions) {
      return;
    }

    const { source, createParentId } = folderActions;
    setFolderActions(null);
    handleCreateFolder(createParentId, source);
  };

  const handleNewMarkdownFromActions = () => {
    if (!folderActions) {
      return;
    }

    const { source, createParentId } = folderActions;
    setFolderActions(null);
    handleCreateDocument(createParentId, source);
  };

  const handleRenameFromActions = () => {
    if (!folderActions) {
      return;
    }

    const { folder, source } = folderActions;
    setFolderActions(null);
    setFolderDialog({
      mode: "edit",
      source,
      folderId: folder.id,
      parentId: folder.parent_id,
      name: folder.name,
      color: folder.color,
      icon: folder.icon,
    });
  };

  const handleDeleteFromActions = () => {
    if (!folderActions) {
      return;
    }

    setDeleteFolderDialog(folderActions);
    setFolderActions(null);
  };

  const handleSaveMarkdown = () => {
    if (!markdownDialog?.name.trim()) {
      return;
    }

    void createDocument(
      markdownDialog.source,
      markdownDialog.name,
      markdownDialog.parentId,
    )
      .then((id) => {
        if (id) {
          onSelect(id);
        }
        if (id) {
          setMarkdownDialog(null);
        }
      })
      .catch(() => undefined);
  };

  const handleDeleteFolder = () => {
    if (!deleteFolderDialog) {
      return;
    }

    void deleteFolder(
      deleteFolderDialog.source,
      deleteFolderDialog.folder.id,
    )
      .then((deleted) => {
        if (!deleted) {
          return;
        }

        if (deleteFolderDialog.source === "local") {
          if (
            selectedId &&
            localItems.find(
              (item): item is WorkspaceDocumentItem =>
                isWorkspaceDocument(item) && item.id === selectedId,
            )?.deleted_at
          ) {
            onDelete?.(selectedId);
          }
        } else if (
          selectedId &&
          cloudItems.some(
            (item) =>
              isWorkspaceDocument(item) &&
              item.id === selectedId &&
              (item.parent_id === deleteFolderDialog.folder.id ||
                getAncestorFolderIds(cloudItems, item.parent_id).has(
                  deleteFolderDialog.folder.id,
                )),
          )
        ) {
          onDelete?.(selectedId);
        }

        setDeleteFolderDialog(null);
      })
      .catch(() => undefined);
  };

  const handleEditFolder = (folder: WorkspaceFolderItem) => {
    setFolderDialog({
      mode: "edit",
      source: displaySource,
      folderId: folder.id,
      parentId: folder.parent_id,
      name: folder.name,
      color: folder.color,
      icon: folder.icon,
    });
  };

  const handleSaveFolder = () => {
    if (!folderDialog?.name.trim()) {
      return;
    }

    if (folderDialog.mode === "create") {
      void createFolder(
        folderDialog.source,
        folderDialog.name,
        folderDialog.parentId,
        folderDialog.color,
        folderDialog.icon,
      )
        .then((createdFolderId) => {
          if (createdFolderId) {
            setFolderDialog(null);
          }
        })
        .catch(() => undefined);
      return;
    } else if (folderDialog.folderId) {
      void renameFolder(
        folderDialog.source,
        folderDialog.folderId,
        folderDialog.name,
        folderDialog.color,
        folderDialog.icon,
      )
        .then(() => setFolderDialog(null))
        .catch(() => undefined);
      return;
    }
  };

  return (
    <div
      className={`flex w-full min-w-0 flex-col ${mobile ? "h-[calc(100dvh-var(--mobile-dashboard-nav-height))] min-h-0" : "h-full"}`}
    >
      {!mobile ? (
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-5">
          <Link
            href="/"
            locale={locale}
            aria-label="Back to Markdown Preview landing page"
            className="flex items-center gap-2.5 rounded-md transition-opacity hover:opacity-80"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              M
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Workspace</p>
              <p className="text-[11px] text-muted-foreground">
                Markdown Preview
              </p>
            </div>
          </Link>
          <button
            type="button"
            aria-label="Create new document"
            disabled={
              isCloudUnauthenticated ||
              (displaySource === "cloud" && cloudBusy)
            }
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            onClick={handleCreateRootDocument}
          >
            <FilePlus2 className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </div>
      ) : null}

      <div className="shrink-0 px-3 pb-2 pt-3">
        <div className="px-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-max shrink-0 items-center gap-2 text-sm font-semibold text-foreground">
              <LibraryBig
                className="h-4 w-4 shrink-0 text-primary"
                strokeWidth={1.7}
              />
              <span
                key={displaySource}
                className="sidebar-source-title-enter truncate"
              >
                {displaySource === "local" ? "Session Files" : "Cloud Files"}
              </span>
            </div>
            <DocumentSourceToggle
              source={displaySource}
              onChange={setActiveSource}
              dragging={draggingItem !== null}
              cloudBlocked={cloudDropBlocked}
              disabled={cloudBusy}
            />
          </div>
        </div>
        {cloudStatusVisible ? (
          <div
            aria-live="polite"
            className="mx-2 mb-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-xs text-muted-foreground"
          >
            {cloudIsHydrating || (!cloudIsHydrated && !cloudError) ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Loading cloud files...
              </span>
            ) : cloudOperation === "transfer" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Transferring workspace items...
              </span>
            ) : cloudIsSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Saving cloud changes...
              </span>
            ) : cloudOperation !== null ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Saving cloud changes...
              </span>
            ) : cloudError ? (
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0">{cloudError.message}</span>
                <button
                  type="button"
                  className="shrink-0 font-semibold text-foreground hover:underline"
                  onClick={() => void hydrateCloudWorkspace()}
                >
                  Retry
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div
        className={`docs-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-2 ${displaySource === "cloud" && cloudBusy ? "pointer-events-none opacity-60" : ""}`}
        aria-busy={displaySource === "cloud" && cloudBusy}
      >
        <FolderTree
          items={sourceItems}
          source={displaySource}
           selectedId={selectedId}
           onSelect={onSelect}
           onRename={(id, title) => renameDocument(displaySource, id, title)}
           onDelete={handleDelete}
           onMove={(id, folderId) => moveDocument(displaySource, id, folderId)}
           onCopy={(id) => copyItem(displaySource, id)}
           onPaste={(folderId) => pasteItem(displaySource, folderId)}
           canPaste={canPasteInto(displaySource)}
          onToggleFavorite={(id) => toggleFavorite(displaySource, id)}
          onCreateDocument={handleCreateDocument}
          onCreateFolder={handleCreateFolder}
          onCreateRootDocument={handleCreateRootDocument}
          onCreateRootFolder={() => handleCreateFolder(null)}
          rootDropActive={rootDropActive}
          onEditFolder={handleEditFolder}
          collapsedFolderIds={collapsedFolderIds}
          onToggleFolder={(folderId) =>
            toggleFolderExpanded(displaySource, folderId)
          }
          cloudUnauthenticated={isCloudUnauthenticated}
          mobile={mobile}
          onOpenFolderActions={handleOpenFolderActions}
          draggingItem={draggingItem}
          dropTargetFolderId={dropTargetFolderId}
          onDragPointerDown={(item, event) =>
            startLongPress({ ...item, source: displaySource }, event)
          }
          onDragClickCapture={suppressClick}
        />
      </div>
      {dragPreviewItem && dragPosition && dragPreviewPhase ? (
        <DragPreview
          item={dragPreviewItem}
          label={
            dragPreviewItem.kind === "folder"
              ? ((dragPreviewItem.source === "cloud" ? cloudItems : localItems)
                  .filter(isWorkspaceFolder)
                  .find((folder) => folder.id === dragPreviewItem.id)?.name ??
                "Folder")
              : (() => {
                  const documents = (
                    dragPreviewItem.source === "cloud" ? cloudItems : localItems
                  ).filter(
                    (item): item is WorkspaceDocumentItem =>
                      isWorkspaceDocument(item) && !item.deleted_at,
                  );
                  return (
                    documents.find((item) => item.id === dragPreviewItem.id)
                      ?.name ?? "Document"
                  );
                })()
          }
          position={dragPosition}
          phase={dragPreviewPhase}
        />
      ) : null}

      <div className="shrink-0 border-t border-border/80 p-3">
        <AuthActions
          mobile
          onOpenSettings={onOpenSettings}
          settingsMode="menu"
        />
      </div>
      <FolderEditorDialog
        open={folderDialog !== null}
        title={folderDialog?.mode === "edit" ? "Edit folder" : "New folder"}
        name={folderDialog?.name ?? ""}
        color={folderDialog?.color ?? "primary"}
        icon={folderDialog?.icon ?? "folder"}
        mobile={mobile}
        onNameChange={(name) =>
          setFolderDialog((current) =>
            current ? { ...current, name } : current,
          )
        }
        onColorChange={(color) =>
          setFolderDialog((current) =>
            current ? { ...current, color } : current,
          )
        }
        onIconChange={(icon) =>
          setFolderDialog((current) =>
            current ? { ...current, icon } : current,
          )
        }
        onClose={() => setFolderDialog(null)}
        onSubmit={handleSaveFolder}
      />
      <FolderActionsDialog
        open={folderActions !== null}
        folderName={folderActions?.folder.name ?? "Workspace"}
        canRenameDelete={
          folderActions !== null &&
          !folderActions.isVirtualRoot &&
          folderActions.folder.parent_id !== null
        }
        canCopy={folderActions !== null && !folderActions.isVirtualRoot}
        canPaste={
          folderActions !== null && canPasteInto(folderActions.source)
        }
        onClose={() => setFolderActions(null)}
        onNewFolder={handleNewFolderFromActions}
        onNewMarkdown={handleNewMarkdownFromActions}
        onCopy={handleCopyFromActions}
        onPaste={handlePasteFromActions}
        onRename={handleRenameFromActions}
        onDelete={handleDeleteFromActions}
      />
      <MarkdownNameDialog
        open={markdownDialog !== null}
        parentName={markdownDialog?.parentName ?? "Workspace"}
        name={markdownDialog?.name ?? ""}
        onNameChange={(name) =>
          setMarkdownDialog((current) =>
            current ? { ...current, name } : current,
          )
        }
        onClose={() => setMarkdownDialog(null)}
        onSubmit={handleSaveMarkdown}
      />
      <DeleteFolderDialog
        open={deleteFolderDialog !== null}
        folderName={deleteFolderDialog?.folder.name ?? ""}
        onClose={() => setDeleteFolderDialog(null)}
        onConfirm={handleDeleteFolder}
      />
    </div>
  );
}
