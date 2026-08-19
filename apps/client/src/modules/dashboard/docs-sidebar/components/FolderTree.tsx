import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pencil,
} from "lucide-react";

import type {
  DocumentFolder,
  DocumentOrganization,
  MockDocument,
} from "@/modules/dashboard/document/model/document.types";

import { DocumentItem, type DocumentFolderOption } from "./DocumentItem";
import { FOLDER_ICON_COLOR_CLASSES } from "./folderColors";

const TREE_INDENT = 22;

function getChildFolders(folders: DocumentFolder[], parentId: string | null) {
  return folders.filter((folder) => folder.parentId === parentId);
}

function getDocumentsInFolder(
  documents: MockDocument[],
  organization: Record<string, DocumentOrganization>,
  folderId: string | null,
) {
  return documents.filter(
    (document) => (organization[document.id]?.folderId ?? null) === folderId,
  );
}

function flattenFolders(
  folders: DocumentFolder[],
  parentId: string | null,
  depth = 0,
): DocumentFolderOption[] {
  return getChildFolders(folders, parentId).flatMap((folder) => [
    { id: folder.id, label: folder.name, depth },
    ...flattenFolders(folders, folder.id, depth + 1),
  ]);
}

export function FolderTree({
  documents,
  folders,
  organization,
  selectedId,
  onSelect,
  onRename,
  onDelete,
  onMove,
  onToggleFavorite,
  onCreateDocument,
  onCreateFolder,
  onEditFolder,
  collapsedFolderIds,
  onToggleFolder,
}: {
  documents: MockDocument[];
  folders: DocumentFolder[];
  organization: Record<string, DocumentOrganization>;
  selectedId: string;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, folderId: string | null) => void;
  onToggleFavorite: (id: string) => void;
  onCreateDocument: (folderId: string) => void;
  onCreateFolder: (parentId: string) => void;
  onEditFolder: (folder: DocumentFolder) => void;
  collapsedFolderIds: string[];
  onToggleFolder: (folderId: string) => void;
}) {
  const rootFolders = getChildFolders(folders, null);
  const folderOptions: DocumentFolderOption[] = rootFolders.flatMap(
    (folder) => [
      { id: folder.id, label: folder.name, depth: 0 },
      ...flattenFolders(folders, folder.id, 1),
    ],
  );
  const visibleDocuments = documents.filter(
    (document) => !organization[document.id]?.deleted,
  );
  const rootDocuments = getDocumentsInFolder(
    visibleDocuments,
    organization,
    null,
  );
  if (!visibleDocuments.length && !folders.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 px-4 py-8 text-center">
        <p className="text-sm font-medium text-foreground">No files here yet</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          New files will appear here when they are added to the workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {rootDocuments.map((document) => (
        <DocumentItem
          key={document.id}
          displayTitle={
            organization[document.id]?.displayTitle ?? document.title
          }
          favorite={organization[document.id]?.favorite === true}
          selected={document.id === selectedId}
          onSelect={() => onSelect(document.id)}
          onRename={(title) => onRename(document.id, title)}
          onDelete={() => onDelete(document.id)}
          onMove={(folderId) => onMove(document.id, folderId)}
          onToggleFavorite={() => onToggleFavorite(document.id)}
          folderId={null}
          folderOptions={folderOptions}
        />
      ))}
      {rootFolders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          depth={0}
          folders={folders}
          documents={visibleDocuments}
          organization={organization}
          selectedId={selectedId}
          folderOptions={folderOptions}
          onSelect={onSelect}
          onRename={onRename}
          onDelete={onDelete}
          onMove={onMove}
          onToggleFavorite={onToggleFavorite}
          onCreateDocument={onCreateDocument}
          onCreateFolder={onCreateFolder}
          onEditFolder={onEditFolder}
          collapsedFolderIds={collapsedFolderIds}
          onToggleFolder={onToggleFolder}
        />
      ))}
    </div>
  );
}

function FolderNode({
  folder,
  depth,
  folders,
  documents,
  organization,
  selectedId,
  folderOptions,
  onSelect,
  onRename,
  onDelete,
  onMove,
  onToggleFavorite,
  onCreateDocument,
  onCreateFolder,
  onEditFolder,
  collapsedFolderIds,
  onToggleFolder,
}: {
  folder: DocumentFolder;
  depth: number;
  folders: DocumentFolder[];
  documents: MockDocument[];
  organization: Record<string, DocumentOrganization>;
  selectedId: string;
  folderOptions: DocumentFolderOption[];
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, folderId: string | null) => void;
  onToggleFavorite: (id: string) => void;
  onCreateDocument: (folderId: string) => void;
  onCreateFolder: (parentId: string) => void;
  onEditFolder: (folder: DocumentFolder) => void;
  collapsedFolderIds: string[];
  onToggleFolder: (folderId: string) => void;
}) {
  const folderItemRef = useRef<HTMLDivElement>(null);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const expanded = !collapsedFolderIds.includes(folder.id);
  const childFolders = getChildFolders(folders, folder.id);
  const childDocuments = getDocumentsInFolder(
    documents,
    organization,
    folder.id,
  );
  const hasChildren = childFolders.length > 0 || childDocuments.length > 0;

  useEffect(() => {
    if (!folderMenuOpen) {
      return;
    }

    const closeMenu = (event: MouseEvent) => {
      if (!folderItemRef.current?.contains(event.target as Node)) {
        setFolderMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFolderMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [folderMenuOpen]);

  return (
    <div
      ref={folderItemRef}
      className={`relative ${depth === 0 ? "mt-4 first:mt-0" : ""}`}
    >
      <div
        className="group/folder flex w-full items-center"
        style={
          depth === 0
            ? undefined
            : { paddingLeft: `${(depth - 1) * TREE_INDENT}px` }
        }
      >
        <button
          type="button"
          aria-expanded={hasChildren ? expanded : undefined}
          className={`flex min-w-0 flex-1 items-center gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/60 hover:text-foreground ${depth === 0 ? "text-foreground" : "text-muted-foreground"}`}
          onClick={() => {
            if (hasChildren || depth === 0) {
              onToggleFolder(folder.id);
            }
          }}
        >
          {depth > 0 ? (
            <ChevronRight
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded && hasChildren ? "rotate-90" : ""} ${hasChildren ? "" : "opacity-0"}`}
              strokeWidth={1.8}
            />
          ) : null}
          <span aria-hidden="true" className="relative h-4 w-4 shrink-0">
            <Folder
              className={`absolute inset-0 h-4 w-4 transition-all duration-200 ease-out ${FOLDER_ICON_COLOR_CLASSES[folder.color]} ${expanded ? "scale-75 opacity-0" : "scale-100 opacity-100"}`}
              strokeWidth={1.7}
            />
            <FolderOpen
              className={`absolute inset-0 h-4 w-4 transition-all duration-200 ease-out ${FOLDER_ICON_COLOR_CLASSES[folder.color]} ${expanded ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
              strokeWidth={1.7}
            />
          </span>
          <span
            className={`min-w-0 flex-1 truncate text-sm ${depth === 0 ? "font-semibold" : "font-medium"}`}
          >
            {folder.name}
          </span>
          <span
            className={`text-[11px] tabular-nums ${depth === 0 ? "text-muted-foreground" : "text-muted-foreground/70"}`}
          >
            {childDocuments.length || childFolders.length}
          </span>
        </button>
        <button
          type="button"
          aria-label={`More options for ${folder.name}`}
          aria-expanded={folderMenuOpen}
          aria-haspopup="menu"
          className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover/folder:opacity-100 sm:group-focus-within/folder:opacity-100"
          onClick={() => setFolderMenuOpen((value) => !value)}
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>
      {folderMenuOpen ? (
        <div
          role="menu"
          aria-label={`${folder.name} actions`}
          className="absolute right-1 top-[calc(100%-0.25rem)] z-50 w-48 rounded-xl border border-border bg-background p-1.5 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent"
            onClick={() => {
              onCreateDocument(folder.id);
              setFolderMenuOpen(false);
            }}
          >
            <FilePlus2 className="h-3.5 w-3.5 text-muted-foreground" />
            New file
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent"
            onClick={() => {
              onCreateFolder(folder.id);
              setFolderMenuOpen(false);
            }}
          >
            <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
            New folder
          </button>
          <div className="my-1 border-t border-border/70" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent"
            onClick={() => {
              onEditFolder(folder);
              setFolderMenuOpen(false);
            }}
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            Edit folder
          </button>
        </div>
      ) : null}
      {expanded ? (
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 border-l border-border/60"
            style={{ left: `${8 + depth * TREE_INDENT}px` }}
          />
          {childDocuments.map((document) => (
            <DocumentItem
              key={document.id}
              displayTitle={
                organization[document.id]?.displayTitle ?? document.title
              }
              favorite={organization[document.id]?.favorite === true}
              selected={document.id === selectedId}
              onSelect={() => onSelect(document.id)}
              onRename={(title) => onRename(document.id, title)}
              onDelete={() => onDelete(document.id)}
              onMove={(folderId) => onMove(document.id, folderId)}
              onToggleFavorite={() => onToggleFavorite(document.id)}
              folderId={folder.id}
              folderOptions={folderOptions}
              depth={depth + 1}
            />
          ))}
          {childFolders.map((childFolder) => (
            <FolderNode
              key={childFolder.id}
              folder={childFolder}
              depth={depth + 1}
              folders={folders}
              documents={documents}
              organization={organization}
              selectedId={selectedId}
              folderOptions={folderOptions}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onMove={onMove}
              onToggleFavorite={onToggleFavorite}
              onCreateDocument={onCreateDocument}
              onCreateFolder={onCreateFolder}
              onEditFolder={onEditFolder}
              collapsedFolderIds={collapsedFolderIds}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
