"use client";

import { FilePlus2, FileText, Folder, LibraryBig } from "lucide-react";
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
  useCloudWorkspaceStore,
  useLocalWorkspaceStore,
  useWorkspaceSessionStore,
} from "@/modules/dashboard/stores";
import { transferWorkspaceItem } from "@/modules/dashboard/stores/workspace-transfer";
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
};

type MarkdownDialogState = {
  source: DocumentSource;
  parentId: string;
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
  const setActiveSourceInSession = useWorkspaceSessionStore(
    (state) => state.setActiveSource,
  );
  const localItems = useLocalWorkspaceStore((state) => state.items);
  const cloudItems = useCloudWorkspaceStore((state) => state.items);
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
    (state) => state.createFolder,
  );
  const renameLocalFolder = useLocalWorkspaceStore(
    (state) => state.renameFolder,
  );
  const renameCloudFolder = useCloudWorkspaceStore(
    (state) => state.renameFolder,
  );
  const deleteLocalFolder = useLocalWorkspaceStore(
    (state) => state.deleteFolder,
  );
  const deleteCloudFolder = useCloudWorkspaceStore(
    (state) => state.deleteFolder,
  );
  const createLocalDocument = useLocalWorkspaceStore(
    (state) => state.createDocument,
  );
  const createCloudDocument = useCloudWorkspaceStore(
    (state) => state.createDocument,
  );
  const renameLocalDocument = useLocalWorkspaceStore(
    (state) => state.renameDocument,
  );
  const renameCloudDocument = useCloudWorkspaceStore(
    (state) => state.renameDocument,
  );
  const moveLocalDocument = useLocalWorkspaceStore(
    (state) => state.moveDocument,
  );
  const moveCloudDocument = useCloudWorkspaceStore(
    (state) => state.moveDocument,
  );
  const moveLocalFolder = useLocalWorkspaceStore((state) => state.moveFolder);
  const moveCloudFolder = useCloudWorkspaceStore((state) => state.moveFolder);
  const toggleLocalFavorite = useLocalWorkspaceStore(
    (state) => state.toggleFavorite,
  );
  const toggleCloudFavorite = useCloudWorkspaceStore(
    (state) => state.toggleFavorite,
  );
  const deleteLocalDocument = useLocalWorkspaceStore(
    (state) => state.deleteDocument,
  );
  const deleteCloudDocument = useCloudWorkspaceStore(
    (state) => state.deleteDocument,
  );
  const flushLocalPendingContent = useLocalWorkspaceStore(
    (state) => state.flushPendingContent,
  );
  const flushCloudPendingContent = useCloudWorkspaceStore(
    (state) => state.flushPendingContent,
  );
  const flushAllLocalPendingContent = useLocalWorkspaceStore(
    (state) => state.flushAllPendingContent,
  );
  const flushAllCloudPendingContent = useCloudWorkspaceStore(
    (state) => state.flushAllPendingContent,
  );
  const setActiveSource = (source: DocumentSource) => {
    if (source === activeSource) {
      return;
    }

    if (selectedDocumentId) {
      (activeSource === "local"
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
      ? createLocalFolder(name, parentId, color, icon)
      : createCloudFolder(name, parentId, color, icon);
  const renameFolder = (
    source: DocumentSource,
    folderId: string,
    name: string,
    color: DocumentFolderColor,
    icon: DocumentFolderIcon,
  ) =>
    (source === "local" ? renameLocalFolder : renameCloudFolder)(
      folderId,
      name,
      color,
      icon,
    );
  const deleteFolder = (source: DocumentSource, folderId: string) =>
    (source === "local" ? deleteLocalFolder : deleteCloudFolder)(folderId);
  const createDocument = (
    source: DocumentSource,
    title: string | undefined,
    parentId: string,
  ) =>
    (source === "local" ? createLocalDocument : createCloudDocument)(
      title,
      parentId,
    );
  const renameDocument = (
    source: DocumentSource,
    documentId: string,
    title: string,
  ) =>
    (source === "local" ? renameLocalDocument : renameCloudDocument)(
      documentId,
      title,
    );
  const moveDocument = (
    source: DocumentSource,
    documentId: string,
    folderId: string | null,
  ) =>
    (source === "local" ? moveLocalDocument : moveCloudDocument)(
      documentId,
      folderId,
    );
  const moveFolder = (
    source: DocumentSource,
    folderId: string,
    parentId: string | null,
  ) =>
    (source === "local" ? moveLocalFolder : moveCloudFolder)(
      folderId,
      parentId,
    );
  const toggleFavorite = (source: DocumentSource, documentId: string) =>
    (source === "local" ? toggleLocalFavorite : toggleCloudFavorite)(
      documentId,
    );
  const deleteDocument = (source: DocumentSource, documentId: string) =>
    (source === "local" ? deleteLocalDocument : deleteCloudDocument)(
      documentId,
    );
  const toggleFolderExpanded = (source: DocumentSource, folderId: string) =>
    (source === "local"
      ? toggleLocalFolderExpanded
      : toggleCloudFolderExpanded)(folderId);
  const displaySource = dragPreviewSource ?? activeSource;
  const canUseCloud = !sessionPending && Boolean(session?.user);
  const isCloudUnauthenticated = displaySource === "cloud" && !canUseCloud;
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
  const rootFolderId = sourceFolders.find(
    (folder) => folder.parent_id === null,
  )?.id;
  const {
    draggingItem,
    dragPosition,
    dragPreviewItem,
    dragPreviewPhase,
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
      const destinationFolderId =
        target.kind === "folder"
          ? target.folderId
          : destinationItems.find(
              (candidate) =>
                isWorkspaceFolder(candidate) && candidate.parent_id === null,
            )?.id;

      if (!destinationFolderId) {
        return false;
      }

      if (item.source === target.source) {
        return item.kind === "folder"
          ? moveFolder(item.source, item.id, destinationFolderId)
          : (moveDocument(item.source, item.id, destinationFolderId), true);
      }

      (item.source === "local"
        ? flushAllLocalPendingContent
        : flushAllCloudPendingContent)();
      const sourceItems =
        item.source === "local"
          ? useLocalWorkspaceStore.getState().items
          : useCloudWorkspaceStore.getState().items;
      const transfer = transferWorkspaceItem({
        itemId: item.id,
        sourceItems,
        destinationItems,
        destinationParentId: destinationFolderId,
      });

      if (!transfer) {
        return false;
      }

      if (item.source === "local") {
        useLocalWorkspaceStore.getState().setItems(transfer.sourceItems);
        useCloudWorkspaceStore.getState().setItems(transfer.destinationItems);
      } else {
        useCloudWorkspaceStore.getState().setItems(transfer.sourceItems);
        useLocalWorkspaceStore.getState().setItems(transfer.destinationItems);
      }

      setActiveSourceInSession(target.source);

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

  const handleDelete = (id: string) => {
    if (sourceDocuments.length <= 1) {
      return;
    }

    deleteDocument(displaySource, id);

    if (displaySource === "local") {
      onDelete?.(id);
    }
  };

  const handleCreateDocument = (
    folderId: string,
    source: DocumentSource = displaySource,
  ) => {
    const sourceItems = source === "local" ? localItems : cloudItems;
    const parentName =
      sourceItems.find(
        (item): item is WorkspaceFolderItem =>
          isWorkspaceFolder(item) && item.id === folderId,
      )?.name ?? "Workspace";

    setMarkdownDialog({
      source,
      parentId: folderId,
      parentName,
      name: "",
    });
  };

  const handleCreateRootDocument = () => {
    if (rootFolderId) {
      handleCreateDocument(rootFolderId);
    }
  };

  const handleCreateFolder = (
    parentId: string,
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

  const handleOpenFolderActions = (folder: WorkspaceFolderItem) => {
    setFolderActions({ source: displaySource, folder });
  };

  const handleNewFolderFromActions = () => {
    if (!folderActions) {
      return;
    }

    const { folder, source } = folderActions;
    setFolderActions(null);
    handleCreateFolder(folder.id, source);
  };

  const handleNewMarkdownFromActions = () => {
    if (!folderActions) {
      return;
    }

    const { folder, source } = folderActions;
    setFolderActions(null);
    handleCreateDocument(folder.id, source);
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

    const id = createDocument(
      markdownDialog.source,
      markdownDialog.name,
      markdownDialog.parentId,
    );

    if (markdownDialog.source === "local") {
      onSelect(id);
    }

    setMarkdownDialog(null);
  };

  const handleDeleteFolder = () => {
    if (!deleteFolderDialog) {
      return;
    }

    const deleted = deleteFolder(
      deleteFolderDialog.source,
      deleteFolderDialog.folder.id,
    );

    if (
      deleted &&
      deleteFolderDialog.source === "local" &&
      selectedId &&
      localItems.find(
        (item): item is WorkspaceDocumentItem =>
          isWorkspaceDocument(item) && item.id === selectedId,
      )?.deleted_at
    ) {
      onDelete?.(selectedId);
    }

    setDeleteFolderDialog(null);
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
      const createdFolderId = createFolder(
        folderDialog.source,
        folderDialog.name,
        folderDialog.parentId,
        folderDialog.color,
        folderDialog.icon,
      );

      if (!createdFolderId) {
        return;
      }
    } else if (folderDialog.folderId) {
      renameFolder(
        folderDialog.source,
        folderDialog.folderId,
        folderDialog.name,
        folderDialog.color,
        folderDialog.icon,
      );
    }

    setFolderDialog(null);
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
            disabled={isCloudUnauthenticated}
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
            />
          </div>
        </div>
      </div>
      <div className="docs-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-2">
        <FolderTree
          items={sourceItems}
          source={displaySource}
          selectedId={selectedId}
          onSelect={onSelect}
          onRename={(id, title) => renameDocument(displaySource, id, title)}
          onDelete={handleDelete}
          onMove={(id, folderId) => moveDocument(displaySource, id, folderId)}
          onToggleFavorite={(id) => toggleFavorite(displaySource, id)}
          onCreateDocument={handleCreateDocument}
          onCreateFolder={handleCreateFolder}
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
        canRenameDelete={folderActions?.folder.parent_id !== null}
        onClose={() => setFolderActions(null)}
        onNewFolder={handleNewFolderFromActions}
        onNewMarkdown={handleNewMarkdownFromActions}
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
