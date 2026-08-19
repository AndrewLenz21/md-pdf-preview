"use client";

import { FilePlus2, LibraryBig } from "lucide-react";
import { useLocale } from "next-intl";
import { useState } from "react";

import { Link } from "@/core/i18n";
import type {
  DocumentFolder,
  DocumentFolderColor,
  MockDocument,
} from "@/modules/dashboard/document/model/document.types";
import {
  useCloudDocumentStore,
  useDocumentOrganizationStore,
  useDocumentStore,
} from "@/modules/dashboard/stores";
import { AuthActions } from "@/modules/navigation/components/AuthActions";

import { DocumentSourceToggle } from "./DocumentSourceToggle";
import { FolderEditorDialog } from "./FolderEditorDialog";
import { FolderTree } from "./FolderTree";

type FolderDialogState = {
  mode: "create" | "edit";
  source: "local" | "cloud";
  folderId?: string;
  parentId: string | null;
  name: string;
  color: DocumentFolderColor;
};

export function DocsSidebar({
  documents,
  selectedId,
  onSelect,
  onDelete,
  onOpenSettings,
  mobile = false,
}: {
  documents: MockDocument[];
  selectedId: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpenSettings?: () => void;
  mobile?: boolean;
}) {
  const locale = useLocale();
  const [folderDialog, setFolderDialog] = useState<FolderDialogState | null>(
    null,
  );
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
  const renameDocument = useDocumentOrganizationStore(
    (state) => state.renameDocument,
  );
  const moveDocument = useDocumentOrganizationStore(
    (state) => state.moveDocument,
  );
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
  const sourceDocuments = activeSource === "local" ? documents : cloudDocuments;
  const sourceFolders = activeSource === "local" ? localFolders : cloudFolders;
  const collapsedFolderIds =
    activeSource === "local"
      ? localCollapsedFolderIds
      : cloudCollapsedFolderIds;
  const sourceOrganization =
    activeSource === "local" ? localOrganization : cloudOrganization;

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

  const rootFolderId = sourceFolders.find(
    (folder) => folder.parentId === null,
  )?.id;

  const handleCreateDocument = (folderId: string) => {
    const id =
      activeSource === "local" ? createLocalDocument() : createCloudDocument();

    moveDocument(activeSource, id, folderId);

    if (activeSource === "local") {
      onSelect(id);
    }
  };

  const handleCreateRootDocument = () => {
    if (rootFolderId) {
      handleCreateDocument(rootFolderId);
    }
  };

  const handleCreateFolder = (parentId: string) => {
    setFolderDialog({
      mode: "create",
      source: activeSource,
      parentId,
      name: "",
      color: "primary",
    });
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
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
        />
      </div>

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
    </div>
  );
}
