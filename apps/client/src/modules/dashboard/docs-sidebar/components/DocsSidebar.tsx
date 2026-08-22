"use client";

import { FilePlus2, FileText, Folder, LibraryBig } from "lucide-react";
import { useLocale } from "next-intl";
import { useState } from "react";

import { Link } from "@/core/i18n";
import { authClient } from "@/lib/auth-client";
import type {
  DocumentFolder,
  DocumentFolderColor,
  DocumentSource,
  MockDocument,
} from "@/modules/dashboard/document/model/document.types";
import {
  useCloudDocumentStore,
  useDocumentOrganizationStore,
  useDocumentStore,
} from "@/modules/dashboard/stores";
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
};

type FolderActionsState = {
  source: DocumentSource;
  folder: DocumentFolder;
};

type MarkdownDialogState = {
  source: DocumentSource;
  parentId: string;
  parentName: string;
  name: string;
};

type DeleteFolderDialogState = {
  source: DocumentSource;
  folder: DocumentFolder;
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
      className="docs-sidebar-dnd-preview-anchor pointer-events-none fixed z-[100] w-max max-w-60"
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
  documents,
  selectedId,
  onSelect,
  onDelete,
  onOpenSettings,
  mobile = false,
}: {
  documents: MockDocument[];
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
  const activeSource = useDocumentOrganizationStore(
    (state) => state.activeSource,
  );
  const localFolders = useDocumentOrganizationStore(
    (state) => state.localFolders,
  );
  const cloudFolders = useDocumentOrganizationStore(
    (state) => state.cloudFolders,
  );
  const localCollapsedFolderIds = useDocumentOrganizationStore(
    (state) => state.localCollapsedFolderIds,
  );
  const cloudCollapsedFolderIds = useDocumentOrganizationStore(
    (state) => state.cloudCollapsedFolderIds,
  );
  const localOrganization = useDocumentOrganizationStore(
    (state) => state.localDocuments,
  );
  const cloudOrganization = useDocumentOrganizationStore(
    (state) => state.cloudDocuments,
  );
  const setActiveSource = useDocumentOrganizationStore(
    (state) => state.setActiveSource,
  );
  const toggleFolderExpanded = useDocumentOrganizationStore(
    (state) => state.toggleFolderExpanded,
  );
  const createFolder = useDocumentOrganizationStore(
    (state) => state.createFolder,
  );
  const renameFolder = useDocumentOrganizationStore(
    (state) => state.renameFolder,
  );
  const deleteFolder = useDocumentOrganizationStore(
    (state) => state.deleteFolder,
  );
  const renameDocument = useDocumentOrganizationStore(
    (state) => state.renameDocument,
  );
  const moveDocument = useDocumentOrganizationStore(
    (state) => state.moveDocument,
  );
  const moveFolder = useDocumentOrganizationStore((state) => state.moveFolder);
  const toggleFavorite = useDocumentOrganizationStore(
    (state) => state.toggleFavorite,
  );
  const deleteDocument = useDocumentOrganizationStore(
    (state) => state.deleteDocument,
  );
  const createLocalDocument = useDocumentStore((state) => state.createDocument);
  const createCloudDocument = useCloudDocumentStore(
    (state) => state.createDocument,
  );
  const cloudDocuments = useCloudDocumentStore((state) => state.documents);
  const isCloudUnauthenticated =
    activeSource === "cloud" && !sessionPending && !session?.user;
  const cloudRootFolder = cloudFolders.find(
    (folder) => folder.parentId === null,
  );
  const sourceDocuments =
    activeSource === "local"
      ? documents
      : isCloudUnauthenticated
        ? []
        : cloudDocuments;
  const sourceFolders =
    activeSource === "local"
      ? localFolders
      : isCloudUnauthenticated
        ? cloudRootFolder
          ? [cloudRootFolder]
          : []
        : cloudFolders;
  const collapsedFolderIds =
    activeSource === "local"
      ? localCollapsedFolderIds
      : cloudCollapsedFolderIds;
  const sourceOrganization =
    activeSource === "local" ? localOrganization : cloudOrganization;
  const rootFolderId = sourceFolders.find(
    (folder) => folder.parentId === null,
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
    onDrop: (item, targetFolderId) => {
      const destinationFolderId = targetFolderId ?? rootFolderId;

      if (!destinationFolderId) {
        return;
      }

      if (item.kind === "folder") {
        moveFolder(activeSource, item.id, destinationFolderId);
        return;
      }

      moveDocument(activeSource, item.id, destinationFolderId);
    },
  });

  const handleDelete = (id: string) => {
    if (
      sourceDocuments.filter(
        (document) => !sourceOrganization[document.id]?.deleted,
      ).length <= 1
    ) {
      return;
    }

    deleteDocument(activeSource, id);

    if (activeSource === "local") {
      onDelete?.(id);
    }
  };

  const handleCreateDocument = (
    folderId: string,
    title?: string,
    source: DocumentSource = activeSource,
  ) => {
    const id =
      source === "local"
        ? createLocalDocument(title)
        : createCloudDocument(title);

    moveDocument(source, id, folderId);

    if (title?.trim()) {
      renameDocument(source, id, title);
    }

    if (source === "local") {
      onSelect(id);
    }
  };

  const handleCreateRootDocument = () => {
    if (rootFolderId) {
      handleCreateDocument(rootFolderId);
    }
  };

  const handleCreateFolder = (
    parentId: string,
    source: DocumentSource = activeSource,
  ) => {
    setFolderDialog({
      mode: "create",
      source,
      parentId,
      name: "",
      color: "primary",
    });
  };

  const handleOpenFolderActions = (folder: DocumentFolder) => {
    setFolderActions({ source: activeSource, folder });
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
    setMarkdownDialog({
      source,
      parentId: folder.id,
      parentName: folder.name,
      name: "",
    });
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
      parentId: folder.parentId,
      name: folder.name,
      color: folder.color,
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

    handleCreateDocument(
      markdownDialog.parentId,
      markdownDialog.name,
      markdownDialog.source,
    );
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
      useDocumentOrganizationStore.getState().localDocuments[selectedId]
        ?.deleted
    ) {
      onDelete?.(selectedId);
    }

    setDeleteFolderDialog(null);
  };

  const handleEditFolder = (folder: DocumentFolder) => {
    setFolderDialog({
      mode: "edit",
      source: activeSource,
      folderId: folder.id,
      parentId: folder.parentId,
      name: folder.name,
      color: folder.color,
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
                key={activeSource}
                className="sidebar-source-title-enter truncate"
              >
                {activeSource === "local" ? "Session Files" : "Cloud Files"}
              </span>
            </div>
            <DocumentSourceToggle
              source={activeSource}
              onChange={setActiveSource}
            />
          </div>
        </div>
      </div>
      <div className="docs-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-2">
        <FolderTree
          documents={sourceDocuments}
          folders={sourceFolders}
          organization={sourceOrganization}
          selectedId={selectedId}
          onSelect={onSelect}
          onRename={(id, title) => renameDocument(activeSource, id, title)}
          onDelete={handleDelete}
          onMove={(id, folderId) => moveDocument(activeSource, id, folderId)}
          onToggleFavorite={(id) => toggleFavorite(activeSource, id)}
          onCreateDocument={handleCreateDocument}
          onCreateFolder={handleCreateFolder}
          onEditFolder={handleEditFolder}
          collapsedFolderIds={collapsedFolderIds}
          onToggleFolder={(folderId) =>
            toggleFolderExpanded(activeSource, folderId)
          }
          cloudUnauthenticated={isCloudUnauthenticated}
          mobile={mobile}
          onOpenFolderActions={handleOpenFolderActions}
          draggingItem={draggingItem}
          dropTargetFolderId={dropTargetFolderId}
          onDragPointerDown={startLongPress}
          onDragClickCapture={suppressClick}
        />
      </div>
      {dragPreviewItem && dragPosition && dragPreviewPhase ? (
        <DragPreview
          item={dragPreviewItem}
          label={
            dragPreviewItem.kind === "folder"
              ? (sourceFolders.find(
                  (folder) => folder.id === dragPreviewItem.id,
                )?.name ?? "Folder")
              : (() => {
                  const document = sourceDocuments.find(
                    (item) => item.id === dragPreviewItem.id,
                  );
                  return document
                    ? (sourceOrganization[document.id]?.displayTitle ??
                        document.title)
                    : "Document";
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
        onClose={() => setFolderDialog(null)}
        onSubmit={handleSaveFolder}
      />
      <FolderActionsDialog
        open={folderActions !== null}
        folderName={folderActions?.folder.name ?? "Workspace"}
        canRenameDelete={folderActions?.folder.parentId !== null}
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
