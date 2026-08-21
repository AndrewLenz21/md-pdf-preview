import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ChevronRight,
  Cloud,
  FilePlus2,
  Files,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
} from "lucide-react";

import { Link } from "@/core/i18n";
import { useDismissableLayer } from "@/shared/hooks/useDismissableLayer";
import type {
  DocumentFolder,
  DocumentOrganization,
  MockDocument,
} from "@/modules/dashboard/document/model/document.types";

import { DocumentItem, type DocumentFolderOption } from "./DocumentItem";
import { FOLDER_ICON_COLOR_CLASSES } from "./folderColors";
import type { LongPressDragItem } from "./longPressDrag";

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
    (document) => (organization[document.id]?.parentId ?? null) === folderId,
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

function EmptyWorkspaceState({
  cloudUnauthenticated,
}: {
  cloudUnauthenticated: boolean;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-accent/50 text-primary shadow-sm">
        {cloudUnauthenticated ? (
          <Cloud className="h-5 w-5" strokeWidth={1.7} />
        ) : (
          <Files className="h-5 w-5" strokeWidth={1.7} />
        )}
      </span>
      <p className="text-sm font-semibold text-foreground">
        {cloudUnauthenticated
          ? "Sync your workspace"
          : "Your workspace is empty"}
      </p>
      <p className="mt-1 max-w-[220px] text-xs leading-5 text-muted-foreground">
        {cloudUnauthenticated
          ? "Sign in to sync your Markdown files across devices."
          : "Create your first folder or Markdown file to get started."}
      </p>
      {cloudUnauthenticated ? (
        <div className="mt-5 flex items-center gap-2">
          <Link
            href="/auth/sign-in"
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Sign In
          </Link>
          <Link
            href="/auth/sign-up"
            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign Up
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function FolderDropLabel({
  isDropTarget,
  folderName,
  count,
  className,
}: {
  isDropTarget: boolean;
  folderName: string;
  count: number;
  className: string;
}) {
  const label = isDropTarget ? `Move to ${folderName}` : String(count);
  const [visibleLabel, setVisibleLabel] = useState(label);
  const [phase, setPhase] = useState<"visible" | "enter">("visible");

  useEffect(() => {
    if (label === visibleLabel) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setVisibleLabel(label);
      setPhase("enter");
    }, 80);

    return () => clearTimeout(timeoutId);
  }, [label, visibleLabel]);

  return (
    <span
      className={`docs-sidebar-dnd-drop-label ${label === visibleLabel ? phase : "exit"} ${className}`}
    >
      {visibleLabel}
    </span>
  );
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
  cloudUnauthenticated,
  mobile,
  onOpenFolderActions,
  draggingItem,
  dropTargetFolderId,
  onDragPointerDown,
  onDragClickCapture,
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
  onCreateDocument: (folderId: string, title?: string) => void;
  onCreateFolder: (parentId: string) => void;
  onEditFolder: (folder: DocumentFolder) => void;
  collapsedFolderIds: string[];
  onToggleFolder: (folderId: string) => void;
  cloudUnauthenticated: boolean;
  mobile: boolean;
  onOpenFolderActions: (folder: DocumentFolder) => void;
  draggingItem: LongPressDragItem | null;
  dropTargetFolderId: string | null;
  onDragPointerDown: (
    item: LongPressDragItem,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => void;
  onDragClickCapture: (event: ReactMouseEvent<HTMLDivElement>) => void;
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
    return <EmptyWorkspaceState cloudUnauthenticated={cloudUnauthenticated} />;
  }

  return (
    <div className="space-y-0.5" data-dnd-root-drop="true">
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
          mobile={mobile}
          dragging={
            draggingItem?.kind === "document" && draggingItem.id === document.id
          }
          onDragPointerDown={(event) =>
            onDragPointerDown({ kind: "document", id: document.id }, event)
          }
          onDragClickCapture={onDragClickCapture}
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
          cloudUnauthenticated={cloudUnauthenticated}
          mobile={mobile}
          onOpenFolderActions={onOpenFolderActions}
          draggingItem={draggingItem}
          dropTargetFolderId={dropTargetFolderId}
          onDragPointerDown={onDragPointerDown}
          onDragClickCapture={onDragClickCapture}
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
  cloudUnauthenticated,
  mobile,
  onOpenFolderActions,
  draggingItem,
  dropTargetFolderId,
  onDragPointerDown,
  onDragClickCapture,
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
  onCreateDocument: (folderId: string, title?: string) => void;
  onCreateFolder: (parentId: string) => void;
  onEditFolder: (folder: DocumentFolder) => void;
  collapsedFolderIds: string[];
  onToggleFolder: (folderId: string) => void;
  cloudUnauthenticated: boolean;
  mobile: boolean;
  onOpenFolderActions: (folder: DocumentFolder) => void;
  draggingItem: LongPressDragItem | null;
  dropTargetFolderId: string | null;
  onDragPointerDown: (
    item: LongPressDragItem,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => void;
  onDragClickCapture: (event: ReactMouseEvent<HTMLDivElement>) => void;
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

  useDismissableLayer({
    enabled: folderMenuOpen,
    refs: [folderItemRef],
    onDismiss: () => setFolderMenuOpen(false),
  });

  return (
    <div
      ref={folderItemRef}
      data-dnd-folder-id={folder.id}
      data-dnd-dragging={
        draggingItem?.kind === "folder" && draggingItem.id === folder.id
          ? "true"
          : undefined
      }
      className={`relative ${depth === 0 ? "mt-4 first:mt-0" : ""}`}
      onClickCapture={onDragClickCapture}
    >
      <div
        data-dnd-item="folder"
        data-dnd-drop-target={
          dropTargetFolderId === folder.id ? "true" : undefined
        }
        className="group/folder flex w-full items-center"
        style={
          depth === 0
            ? undefined
            : { paddingLeft: `${(depth - 1) * TREE_INDENT}px` }
        }
        onPointerDown={(event) =>
          onDragPointerDown({ kind: "folder", id: folder.id }, event)
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
            className={`docs-sidebar-dnd-label min-w-0 flex-1 truncate text-sm ${depth === 0 ? "font-semibold" : "font-medium"}`}
          >
            {folder.name}
          </span>
          <FolderDropLabel
            isDropTarget={
              dropTargetFolderId === folder.id && draggingItem !== null
            }
            folderName={folder.name}
            count={childDocuments.length || childFolders.length}
            className={`text-[11px] tabular-nums ${depth === 0 ? "text-muted-foreground" : "text-muted-foreground/70"}`}
          />
        </button>
        {!cloudUnauthenticated ? (
          <button
            type="button"
            aria-label={
              mobile
                ? `Create in ${folder.name}`
                : `Folder actions for ${folder.name}`
            }
            aria-expanded={mobile ? undefined : folderMenuOpen}
            aria-haspopup={mobile ? "dialog" : "menu"}
            data-dnd-ignore="true"
            className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover/folder:opacity-100 sm:group-focus-within/folder:opacity-100"
            onClick={() => {
              if (mobile) {
                onOpenFolderActions(folder);
                return;
              }

              setFolderMenuOpen((value) => !value);
            }}
          >
            <Plus className="h-4 w-4" strokeWidth={1.8} />
          </button>
        ) : null}
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
          {depth > 0 ? (
            <>
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
            </>
          ) : null}
        </div>
      ) : null}
      {expanded ? (
        !hasChildren && depth === 0 ? (
          <EmptyWorkspaceState cloudUnauthenticated={cloudUnauthenticated} />
        ) : (
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
                mobile={mobile}
                dragging={
                  draggingItem?.kind === "document" &&
                  draggingItem.id === document.id
                }
                onDragPointerDown={(event) =>
                  onDragPointerDown(
                    { kind: "document", id: document.id },
                    event,
                  )
                }
                onDragClickCapture={onDragClickCapture}
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
                cloudUnauthenticated={cloudUnauthenticated}
                mobile={mobile}
                onOpenFolderActions={onOpenFolderActions}
                draggingItem={draggingItem}
                dropTargetFolderId={dropTargetFolderId}
                onDragPointerDown={onDragPointerDown}
                onDragClickCapture={onDragClickCapture}
              />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
