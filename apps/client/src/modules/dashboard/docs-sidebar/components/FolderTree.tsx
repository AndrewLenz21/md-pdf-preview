import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  ChevronRight,
  Cloud,
  ClipboardPaste,
  Copy,
  FilePlus2,
  Files,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Link } from "@/core/i18n";
import { useDismissableLayer } from "@/shared/hooks/useDismissableLayer";
import type {
  DocumentSource,
  WorkspaceDocumentItem,
  WorkspaceFolderItem,
  WorkspaceItem,
} from "@/modules/dashboard/document/model/document.types";
import {
  isWorkspaceDocument,
  isWorkspaceFolder,
} from "@/modules/dashboard/stores";

import { DocumentItem, type DocumentFolderOption } from "./DocumentItem";
import { FOLDER_ICON_COLOR_CLASSES } from "./folderColors";
import { FolderIcon } from "./folderIcons";
import type { LongPressDragItem } from "./longPressDrag";

const TREE_INDENT = 8;
const TREE_LAYOUT_ITEM_SELECTOR = "[data-tree-layout-id]";
const TREE_LAYOUT_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const CLOUD_WORKSPACE_ROOT: WorkspaceFolderItem = {
  id: "cloud-workspace-root",
  type: "folder",
  parent_id: null,
  name: "Workspace",
  created_at: "1970-01-01T00:00:00.000Z",
  updated_at: "1970-01-01T00:00:00.000Z",
  color: "primary",
  icon: "folder",
};

type TreeItemPosition = {
  left: number;
  top: number;
};

function useTreeLayoutAnimation(
  treeRef: RefObject<HTMLDivElement | null>,
  layoutKey: string,
) {
  const previousPositionsRef = useRef<Map<string, TreeItemPosition>>(new Map());
  const initializedRef = useRef(false);
  const animationsRef = useRef<Map<string, Animation>>(new Map());

  useLayoutEffect(() => {
    const tree = treeRef.current;

    if (!tree) {
      return;
    }

    const items = Array.from(
      tree.querySelectorAll<HTMLElement>(TREE_LAYOUT_ITEM_SELECTOR),
    );
    const positions = new Map(
      items.map((item) => {
        const rect = item.getBoundingClientRect();
        return [
          item.dataset.treeLayoutId ?? "",
          { left: rect.left, top: rect.top },
        ];
      }),
    );

    const prefersReducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    if (initializedRef.current && !prefersReducedMotion) {
      items.forEach((item) => {
        const id = item.dataset.treeLayoutId;

        if (!id || typeof item.animate !== "function") {
          return;
        }

        const previousPosition = previousPositionsRef.current.get(id);
        const nextPosition = positions.get(id);
        const animation = animationsRef.current.get(id);

        animation?.cancel();

        const keyframes =
          previousPosition && nextPosition
            ? (() => {
                const x = previousPosition.left - nextPosition.left;
                const y = previousPosition.top - nextPosition.top;

                if (Math.abs(x) < 1 && Math.abs(y) < 1) {
                  return null;
                }

                return [
                  { transform: `translate3d(${x}px, ${y}px, 0)` },
                  { transform: "translate3d(0, 0, 0)" },
                ];
              })()
            : [
                {
                  opacity: 0,
                  transform: "translate3d(0, 0.4rem, 0) scale(0.97)",
                },
                { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
              ];

        if (!keyframes) {
          return;
        }

        const nextAnimation = item.animate(keyframes, {
          duration: previousPosition ? 260 : 160,
          easing: TREE_LAYOUT_EASING,
        });

        animationsRef.current.set(id, nextAnimation);
        nextAnimation.onfinish = () => {
          if (animationsRef.current.get(id) === nextAnimation) {
            animationsRef.current.delete(id);
          }
        };
        nextAnimation.oncancel = () => {
          if (animationsRef.current.get(id) === nextAnimation) {
            animationsRef.current.delete(id);
          }
        };
      });
    }

    previousPositionsRef.current = positions;
    initializedRef.current = true;
  }, [layoutKey, treeRef]);

  useEffect(
    () => () => {
      animationsRef.current.forEach((animation) => animation.cancel());
    },
    [],
  );
}

function getChildFolders(items: WorkspaceItem[], parentId: string | null) {
  return items.filter(
    (item): item is WorkspaceFolderItem =>
      isWorkspaceFolder(item) && item.parent_id === parentId,
  );
}

function getDocumentsInFolder(items: WorkspaceItem[], folderId: string | null) {
  return items.filter(
    (item): item is WorkspaceDocumentItem =>
      isWorkspaceDocument(item) &&
      !item.deleted_at &&
      item.parent_id === folderId,
  );
}

function flattenFolders(
  items: WorkspaceItem[],
  parentId: string | null,
  depth = 0,
): DocumentFolderOption[] {
  return getChildFolders(items, parentId).flatMap((folder) => [
    { id: folder.id, label: folder.name, depth },
    ...flattenFolders(items, folder.id, depth + 1),
  ]);
}

function EmptyWorkspaceState({
  cloudUnauthenticated,
  isDropTarget,
  source,
  onCreateDocument,
  onCreateFolder,
}: {
  cloudUnauthenticated: boolean;
  isDropTarget: boolean;
  source: DocumentSource;
  onCreateDocument?: () => void;
  onCreateFolder?: () => void;
}) {
  const isCloud = source === "cloud";

  return (
    <div
      className={`flex min-h-64 flex-col items-center justify-center rounded-2xl px-6 py-16 text-center transition-[background-color,border-color,box-shadow] ${isDropTarget ? "border-2 border-dashed border-primary/60 bg-primary/5 shadow-inner" : "border border-transparent"}`}
    >
      <span
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-accent/50 text-primary shadow-sm ${isDropTarget ? "scale-105 border-primary/60 bg-primary/10" : ""}`}
      >
        {isDropTarget && isCloud ? (
          <Cloud className="h-5 w-5" strokeWidth={1.7} />
        ) : cloudUnauthenticated ? (
          <Cloud className="h-5 w-5" strokeWidth={1.7} />
        ) : (
          <Files className="h-5 w-5" strokeWidth={1.7} />
        )}
      </span>
      <p className="text-sm font-semibold text-foreground">
        {isDropTarget
          ? isCloud
            ? "Drop to save your first Cloud item"
            : "Drop to add your first item"
          : cloudUnauthenticated
          ? "Sync your workspace"
          : "Your workspace is empty"}
      </p>
      <p className="mt-1 max-w-[220px] text-xs leading-5 text-muted-foreground">
        {isDropTarget
          ? "Release the file or folder here to continue."
          : cloudUnauthenticated
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
      {!cloudUnauthenticated && (onCreateDocument || onCreateFolder) ? (
        <div className="mt-5 flex items-center gap-2">
          {onCreateDocument ? (
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
              onClick={onCreateDocument}
            >
              New file
            </button>
          ) : null}
          {onCreateFolder ? (
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              onClick={onCreateFolder}
            >
              New folder
            </button>
          ) : null}
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
  items,
  source,
  selectedId,
  onSelect,
  onRename,
  onDelete,
  onMove,
  onCopy,
  onPaste,
  canPaste,
  onToggleFavorite,
  onCreateDocument,
  onCreateFolder,
  onCreateRootDocument,
  onCreateRootFolder,
  rootDropActive,
  onEditFolder,
  onDeleteFolder,
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
  items: WorkspaceItem[];
  source: DocumentSource;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, folderId: string | null) => void;
  onCopy: (id: string) => void;
  onPaste: (folderId: string | null) => void;
  canPaste: boolean;
  onToggleFavorite: (id: string) => void;
  onCreateDocument: (folderId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateRootDocument?: () => void;
  onCreateRootFolder?: () => void;
  rootDropActive: boolean;
  onEditFolder: (folder: WorkspaceFolderItem) => void;
  onDeleteFolder: (folder: WorkspaceFolderItem) => void;
  collapsedFolderIds: string[];
  onToggleFolder: (folderId: string) => void;
  cloudUnauthenticated: boolean;
  mobile: boolean;
  onOpenFolderActions: (
    folder: WorkspaceFolderItem,
    createParentId?: string | null,
  ) => void;
  draggingItem: LongPressDragItem | null;
  dropTargetFolderId: string | null;
  onDragPointerDown: (
    item: LongPressDragItem,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => void;
  onDragClickCapture: (event: ReactMouseEvent<HTMLDivElement>) => void;
}) {
  const treeRef = useRef<HTMLDivElement>(null);
  const rootFolders = getChildFolders(items, null);
  const isVirtualCloudRoot = source === "cloud" && !cloudUnauthenticated;
  const folderOptions: DocumentFolderOption[] = isVirtualCloudRoot
    ? [
        { id: null, label: CLOUD_WORKSPACE_ROOT.name, depth: 0 },
        ...rootFolders.flatMap((folder) => [
          { id: folder.id, label: folder.name, depth: 1 },
          ...flattenFolders(items, folder.id, 2),
        ]),
      ]
    : rootFolders.flatMap((folder) => [
        { id: folder.id, label: folder.name, depth: 0 },
        ...flattenFolders(items, folder.id, 1),
      ]);
  const foldersToRender = isVirtualCloudRoot
    ? [CLOUD_WORKSPACE_ROOT]
    : rootFolders;
  const visibleDocuments = items.filter(
    (item): item is WorkspaceDocumentItem =>
      isWorkspaceDocument(item) && !item.deleted_at,
  );
  const rootDocuments = getDocumentsInFolder(items, null);
  const layoutKey = [
    ...items
      .filter(isWorkspaceFolder)
      .map((folder) => `folder:${folder.id}:${folder.parent_id ?? ""}`),
    ...visibleDocuments.map(
      (document) => `document:${document.id}:${document.parent_id ?? ""}`,
    ),
    ...collapsedFolderIds,
  ].join("|");

  useTreeLayoutAnimation(treeRef, layoutKey);

  return (
    <div
      ref={treeRef}
      className="space-y-0.5"
      data-dnd-root-drop="true"
      data-dnd-source={source}
    >
      {!isVirtualCloudRoot &&
      !visibleDocuments.length &&
      !items.some(isWorkspaceFolder) ? (
        <EmptyWorkspaceState
          cloudUnauthenticated={cloudUnauthenticated}
          isDropTarget={rootDropActive}
          source={source}
          onCreateDocument={onCreateRootDocument}
          onCreateFolder={onCreateRootFolder}
        />
      ) : (
        <>
          {!isVirtualCloudRoot
            ? rootDocuments.map((document) => (
                <DocumentItem
                  key={document.id}
                  documentId={document.id}
                  displayTitle={document.name}
                  favorite={document.favorite === true}
                   selected={document.id === selectedId}
                   onSelect={() => onSelect(document.id)}
                   onRename={(title) => onRename(document.id, title)}
                   onDelete={() => onDelete(document.id)}
                   onCopy={() => onCopy(document.id)}
                   onMove={(folderId) => onMove(document.id, folderId)}
                  onToggleFavorite={() => onToggleFavorite(document.id)}
                  folderId={null}
                  folderOptions={folderOptions}
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
              ))
            : null}
          {foldersToRender.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              depth={0}
              isVirtualRoot={isVirtualCloudRoot}
              items={items}
              source={source}
              selectedId={selectedId}
              folderOptions={folderOptions}
               onSelect={onSelect}
               onRename={onRename}
               onDelete={onDelete}
               onMove={onMove}
               onCopy={onCopy}
               onPaste={onPaste}
               canPaste={canPaste}
              onToggleFavorite={onToggleFavorite}
              onCreateDocument={onCreateDocument}
              onCreateFolder={onCreateFolder}
              onEditFolder={onEditFolder}
              onDeleteFolder={onDeleteFolder}
              collapsedFolderIds={collapsedFolderIds}
              onToggleFolder={onToggleFolder}
              cloudUnauthenticated={cloudUnauthenticated}
              mobile={mobile}
              onOpenFolderActions={onOpenFolderActions}
              rootDropActive={rootDropActive}
              draggingItem={draggingItem}
              dropTargetFolderId={dropTargetFolderId}
              onDragPointerDown={onDragPointerDown}
              onDragClickCapture={onDragClickCapture}
            />
          ))}
        </>
      )}
    </div>
  );
}

function FolderNode({
  folder,
  depth,
  isVirtualRoot = false,
  items,
  source,
  selectedId,
  folderOptions,
  onSelect,
  onRename,
  onDelete,
  onMove,
  onCopy,
  onPaste,
  canPaste,
  onToggleFavorite,
  onCreateDocument,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  collapsedFolderIds,
  onToggleFolder,
  cloudUnauthenticated,
  mobile,
  onOpenFolderActions,
  rootDropActive,
  draggingItem,
  dropTargetFolderId,
  onDragPointerDown,
  onDragClickCapture,
}: {
  folder: WorkspaceFolderItem;
  depth: number;
  isVirtualRoot?: boolean;
  items: WorkspaceItem[];
  source: DocumentSource;
  selectedId: string | null;
  folderOptions: DocumentFolderOption[];
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, folderId: string | null) => void;
  onCopy: (id: string) => void;
  onPaste: (folderId: string | null) => void;
  canPaste: boolean;
  onToggleFavorite: (id: string) => void;
  onCreateDocument: (folderId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onEditFolder: (folder: WorkspaceFolderItem) => void;
  onDeleteFolder: (folder: WorkspaceFolderItem) => void;
  collapsedFolderIds: string[];
  onToggleFolder: (folderId: string) => void;
  cloudUnauthenticated: boolean;
  mobile: boolean;
  onOpenFolderActions: (
    folder: WorkspaceFolderItem,
    createParentId?: string | null,
  ) => void;
  rootDropActive: boolean;
  draggingItem: LongPressDragItem | null;
  dropTargetFolderId: string | null;
  onDragPointerDown: (
    item: LongPressDragItem,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => void;
  onDragClickCapture: (event: ReactMouseEvent<HTMLDivElement>) => void;
}) {
  const folderItemRef = useRef<HTMLDivElement>(null);
  const closeFolderMenuTimerRef = useRef<number | undefined>(undefined);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [folderMenuRendered, setFolderMenuRendered] = useState(false);
  const [folderMenuClosing, setFolderMenuClosing] = useState(false);
  const expanded = !collapsedFolderIds.includes(folder.id);
  const childParentId = isVirtualRoot ? null : folder.id;
  const childFolders = getChildFolders(items, childParentId);
  const childDocuments = getDocumentsInFolder(items, childParentId);
  const hasChildren = childFolders.length > 0 || childDocuments.length > 0;

  const clearCloseFolderMenuTimer = () => {
    if (closeFolderMenuTimerRef.current !== undefined) {
      window.clearTimeout(closeFolderMenuTimerRef.current);
      closeFolderMenuTimerRef.current = undefined;
    }
  };

  const closeFolderMenu = () => {
    clearCloseFolderMenuTimer();
    setFolderMenuOpen(false);
    setFolderMenuClosing(true);
    closeFolderMenuTimerRef.current = window.setTimeout(() => {
      setFolderMenuRendered(false);
      setFolderMenuClosing(false);
      closeFolderMenuTimerRef.current = undefined;
    }, 200);
  };

  useEffect(() => {
    return () => clearCloseFolderMenuTimer();
  }, []);

  const toggleFolderMenu = () => {
    if (folderMenuOpen) {
      closeFolderMenu();
      return;
    }

    clearCloseFolderMenuTimer();
    setFolderMenuClosing(false);
    setFolderMenuRendered(true);
    setFolderMenuOpen(true);
  };

  useDismissableLayer({
    enabled: folderMenuRendered,
    refs: [folderItemRef],
    onDismiss: closeFolderMenu,
  });

  return (
    <div
      ref={folderItemRef}
      data-dnd-folder-id={isVirtualRoot ? undefined : folder.id}
      data-dnd-root-drop={isVirtualRoot ? "true" : undefined}
      data-dnd-source={source}
      data-dnd-dragging={
        draggingItem?.kind === "folder" && draggingItem.id === folder.id
          ? "true"
          : undefined
      }
      className={`relative ${depth === 0 ? "mt-4 first:mt-0" : ""}`}
      onClickCapture={onDragClickCapture}
    >
      <div className="relative">
        <div
          data-dnd-item="folder"
          data-tree-layout-id={`folder:${folder.id}`}
          data-dnd-drop-target={
            !isVirtualRoot && dropTargetFolderId === folder.id
              ? "true"
              : undefined
          }
          className={`group/folder flex w-full items-center ${isVirtualRoot && rootDropActive ? "rounded-lg bg-primary/5 ring-1 ring-inset ring-primary/40" : ""}`}
          style={
            depth === 0
              ? undefined
              : { paddingLeft: `${depth * TREE_INDENT}px` }
          }
          onPointerDown={
            isVirtualRoot
              ? undefined
              : (event) =>
                  onDragPointerDown({ kind: "folder", id: folder.id }, event)
          }
        >
          <button
            type="button"
            aria-expanded={hasChildren ? expanded : undefined}
            className={`flex min-w-0 flex-1 items-center gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/60 hover:text-foreground ${depth === 0 ? "text-foreground" : "text-muted-foreground"} ${isVirtualRoot && rootDropActive ? "text-foreground" : ""}`}
            onClick={() => {
              if (hasChildren || depth === 0) {
                onToggleFolder(folder.id);
              }
            }}
          >
            <span aria-hidden="true" className="relative h-4 w-4 shrink-0">
              <FolderIcon
                icon={folder.icon}
                className={`absolute inset-0 h-4 w-4 transition-[transform,opacity] duration-150 ease-out ${FOLDER_ICON_COLOR_CLASSES[folder.color]} ${hasChildren ? "group-hover/folder:scale-75 group-hover/folder:opacity-0 group-focus-visible/folder:scale-75 group-focus-visible/folder:opacity-0" : expanded ? "scale-100 opacity-100" : "scale-95 opacity-100"}`}
              />
              {hasChildren ? (
                <ChevronRight
                  aria-hidden="true"
                  className={`absolute inset-0 h-4 w-4 scale-75 opacity-0 transition-[transform,opacity] duration-150 ease-out group-hover/folder:scale-100 group-hover/folder:opacity-100 group-focus-visible/folder:scale-100 group-focus-visible/folder:opacity-100 ${expanded ? "rotate-90" : ""}`}
                  strokeWidth={1.8}
                />
              ) : null}
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
                  onOpenFolderActions(
                    folder,
                    isVirtualRoot ? null : folder.id,
                  );
                  return;
                }

                toggleFolderMenu();
              }}
            >
              <Plus className="h-4 w-4" strokeWidth={1.8} />
            </button>
          ) : null}
        </div>
        {folderMenuRendered ? (
          <div
            role="menu"
            aria-label={`${folder.name} actions`}
            data-dnd-ignore="true"
            className={`${folderMenuClosing ? "workspace-menu-popover-exit" : "workspace-menu-popover-enter"} absolute right-1 top-[calc(100%-0.25rem)] z-50 w-48 rounded-xl border border-border bg-background p-1.5 shadow-xl`}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent"
              onClick={() => {
                onCreateDocument(isVirtualRoot ? null : folder.id);
                closeFolderMenu();
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
                onCreateFolder(isVirtualRoot ? null : folder.id);
                closeFolderMenu();
              }}
            >
              <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
              New folder
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!canPaste}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                onPaste(isVirtualRoot ? null : folder.id);
                closeFolderMenu();
              }}
            >
              <ClipboardPaste className="h-3.5 w-3.5 text-muted-foreground" />
              Paste here
            </button>
            {!isVirtualRoot ? (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent"
                onClick={() => {
                  onCopy(folder.id);
                  closeFolderMenu();
                }}
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                Copy
              </button>
            ) : null}
            {depth > 0 ? (
              <>
                <div className="my-1 border-t border-border/70" />
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  onClick={() => {
                    onEditFolder(folder);
                    closeFolderMenu();
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  Edit folder
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                  onClick={() => {
                    onDeleteFolder(folder);
                    closeFolderMenu();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      {expanded ? (
        !hasChildren && depth === 0 ? (
          <EmptyWorkspaceState
            cloudUnauthenticated={cloudUnauthenticated}
            isDropTarget={rootDropActive}
            source={source}
          />
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
                documentId={document.id}
                displayTitle={document.name}
                favorite={document.favorite === true}
                 selected={document.id === selectedId}
                 onSelect={() => onSelect(document.id)}
                 onRename={(title) => onRename(document.id, title)}
                 onDelete={() => onDelete(document.id)}
                 onCopy={() => onCopy(document.id)}
                 onMove={(folderId) => onMove(document.id, folderId)}
                onToggleFavorite={() => onToggleFavorite(document.id)}
                folderId={isVirtualRoot ? null : folder.id}
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
                isVirtualRoot={false}
                items={items}
                source={source}
                selectedId={selectedId}
                folderOptions={folderOptions}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
                onMove={onMove}
                onCopy={onCopy}
                onPaste={onPaste}
                canPaste={canPaste}
                onToggleFavorite={onToggleFavorite}
                onCreateDocument={onCreateDocument}
                onCreateFolder={onCreateFolder}
                onEditFolder={onEditFolder}
                onDeleteFolder={onDeleteFolder}
                collapsedFolderIds={collapsedFolderIds}
                onToggleFolder={onToggleFolder}
                cloudUnauthenticated={cloudUnauthenticated}
                mobile={mobile}
                onOpenFolderActions={onOpenFolderActions}
                rootDropActive={rootDropActive}
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
