import {
  ClipboardPaste,
  Copy,
  FilePlus2,
  FolderPlus,
  Pencil,
  Trash2,
} from "lucide-react";

import { ModalShell } from "@/shared/components/ModalShell";

export function FolderActionsDialog({
  open,
  folderName,
  canRenameDelete,
  canCopy,
  canPaste,
  onClose,
  onNewFolder,
  onNewMarkdown,
  onCopy,
  onPaste,
  onRename,
  onDelete,
}: {
  open: boolean;
  folderName: string;
  canRenameDelete: boolean;
  canCopy: boolean;
  canPaste: boolean;
  onClose: () => void;
  onNewFolder: () => void;
  onNewMarkdown: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={folderName}
      description="Choose an action for this folder."
      closeLabel="Close folder actions"
      maxWidth="max-w-sm"
    >
      <div className="space-y-1">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onNewFolder}
        >
          <FolderPlus
            className="h-4 w-4 text-muted-foreground"
            strokeWidth={1.7}
          />
          New folder
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onNewMarkdown}
        >
          <FilePlus2
            className="h-4 w-4 text-muted-foreground"
            strokeWidth={1.7}
          />
          New markdown
        </button>
        <button
          type="button"
          disabled={!canPaste}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onPaste}
        >
          <ClipboardPaste
            className="h-4 w-4 text-muted-foreground"
            strokeWidth={1.7}
          />
          Paste here
        </button>
        {canCopy ? (
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onCopy}
          >
            <Copy className="h-4 w-4 text-muted-foreground" strokeWidth={1.7} />
            Copy
          </button>
        ) : null}
        {canRenameDelete ? (
          <>
            <div className="my-2 border-t border-border/70" />
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onRename}
            >
              <Pencil
                className="h-4 w-4 text-muted-foreground"
                strokeWidth={1.7}
              />
              Change name
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.7} />
              Delete
            </button>
          </>
        ) : null}
      </div>
    </ModalShell>
  );
}
