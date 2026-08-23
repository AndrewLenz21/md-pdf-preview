import { Copy, FolderInput, Pencil, Star, Trash2 } from "lucide-react";

import { ModalShell } from "@/shared/components/ModalShell";

export function DocumentActionsDialog({
  open,
  displayTitle,
  favorite,
  onClose,
  onToggleFavorite,
  onRename,
  onCopy,
  onMove,
  onDelete,
}: {
  open: boolean;
  displayTitle: string;
  favorite: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
  onRename: () => void;
  onCopy: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={displayTitle}
      description="Choose an action for this markdown file."
      closeLabel="Close file actions"
      maxWidth="max-w-sm"
    >
      <div className="space-y-1">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onToggleFavorite}
        >
          <Star
            className={`h-4 w-4 ${favorite ? "fill-current text-primary" : "text-muted-foreground"}`}
            strokeWidth={1.7}
          />
          {favorite ? "Remove from Favorites" : "Add to Favorites"}
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onRename}
        >
          <Pencil className="h-4 w-4 text-muted-foreground" strokeWidth={1.7} />
          Rename
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onCopy}
        >
          <Copy className="h-4 w-4 text-muted-foreground" strokeWidth={1.7} />
          Copy
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onMove}
        >
          <FolderInput
            className="h-4 w-4 text-muted-foreground"
            strokeWidth={1.7}
          />
          Move to
        </button>
        <div className="my-2 border-t border-border/70" />
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.7} />
          Delete
        </button>
      </div>
    </ModalShell>
  );
}
