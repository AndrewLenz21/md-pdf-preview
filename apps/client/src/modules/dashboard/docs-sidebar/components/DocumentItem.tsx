import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  FileText,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";

const TREE_INDENT = 22;

export type DocumentFolderOption = {
  id: string | null;
  label: string;
  depth: number;
};

export function DocumentItem({
  displayTitle,
  favorite,
  selected,
  onSelect,
  onRename,
  onDelete,
  onMove,
  onToggleFavorite,
  folderId,
  folderOptions,
  depth = 0,
}: {
  displayTitle: string;
  favorite: boolean;
  selected: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onMove: (folderId: string | null) => void;
  onToggleFavorite: () => void;
  folderId: string | null;
  folderOptions: DocumentFolderOption[];
  depth?: number;
}) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<"actions" | "move">("actions");
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(displayTitle);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const closeMenu = (event: MouseEvent) => {
      if (!itemRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setMenuView("actions");
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setMenuView("actions");
      }
    };

    globalThis.document.addEventListener("mousedown", closeMenu);
    globalThis.document.addEventListener("keydown", closeOnEscape);

    return () => {
      globalThis.document.removeEventListener("mousedown", closeMenu);
      globalThis.document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuView("actions");
  };

  const commitRename = () => {
    const nextTitle = draftTitle.trim();

    if (nextTitle && nextTitle !== displayTitle) {
      onRename(nextTitle);
    }

    setRenaming(false);
  };

  const openMenu = () => {
    setMenuView("actions");
    setMenuOpen((value) => !value);
  };

  return (
    <div
      ref={itemRef}
      className={`group/document relative flex min-w-0 items-center rounded-lg border-l-2 transition-colors ${selected ? "border-primary bg-accent text-accent-foreground shadow-sm" : "border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
      style={{
        paddingLeft:
          depth === 0 ? "8px" : `${7 + (depth - 1) * TREE_INDENT}px`,
      }}
    >
      {renaming ? (
        <input
          autoFocus
          value={draftTitle}
          maxLength={120}
          aria-label={`Rename ${displayTitle}`}
          className="min-w-0 flex-1 rounded-md border border-ring/60 bg-background px-2 py-1.5 text-sm font-medium text-foreground outline-none ring-2 ring-ring/20"
          onChange={(event) => setDraftTitle(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitRename();
            }

            if (event.key === "Escape") {
              setDraftTitle(displayTitle);
              setRenaming(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          aria-current={selected ? "page" : undefined}
          className="flex min-w-0 flex-1 items-center gap-0.5 px-1 py-1.5 text-left"
        >
          <FileText
            className={`h-4 w-4 shrink-0 ${selected ? "text-primary" : "text-muted-foreground/70 group-hover/document:text-foreground"}`}
            strokeWidth={1.7}
          />
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={`min-w-0 flex-1 truncate text-sm ${selected ? "font-medium" : "font-normal"}`}
            >
              {displayTitle}
            </span>
          </span>
        </button>
      )}

      <button
        type="button"
        aria-label={`More options for ${displayTitle}`}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-colors hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover/document:opacity-100 sm:group-focus-within/document:opacity-100"
        onClick={(event) => {
          event.stopPropagation();
          openMenu();
        }}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.8} />
      </button>

      {menuOpen ? (
        <div
          role="menu"
          aria-label={`${displayTitle} actions`}
          className="absolute right-1 top-[calc(100%-0.25rem)] z-50 w-52 overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-xl"
        >
          {menuView === "actions" ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent"
                onClick={() => {
                  onToggleFavorite();
                  closeMenu();
                }}
              >
                <Star
                  className={`h-3.5 w-3.5 ${favorite ? "fill-current text-primary" : "text-muted-foreground"}`}
                  strokeWidth={1.7}
                />
                {favorite ? "Remove from Favorites" : "Add to Favorites"}
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent"
                onClick={() => {
                  setDraftTitle(displayTitle);
                  setRenaming(true);
                  closeMenu();
                }}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent"
                onClick={() => setMenuView("move")}
              >
                <FolderInput className="h-3.5 w-3.5 text-muted-foreground" />
                Move To
              </button>
              <div className="my-1 border-t border-border/70" />
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                onClick={() => {
                  if (
                    typeof window === "undefined" ||
                    window.confirm(`Delete ${displayTitle}?`)
                  ) {
                    onDelete();
                    closeMenu();
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => setMenuView("actions")}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Move To
              </button>
              <div className="my-1 border-t border-border/70" />
              <div className="docs-sidebar-scroll max-h-64 overflow-y-auto">
                {folderOptions.map((option) => {
                  const current = option.id === folderId;

                  return (
                    <button
                      key={option.id ?? "root"}
                      type="button"
                      role="menuitemradio"
                      aria-checked={current}
                      disabled={current}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${current ? "cursor-default bg-accent/60 font-semibold text-foreground" : "font-medium text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                      style={{ paddingLeft: `${10 + option.depth * 12}px` }}
                      onClick={() => {
                        onMove(option.id);
                        closeMenu();
                      }}
                    >
                      <span className="min-w-0 truncate">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
