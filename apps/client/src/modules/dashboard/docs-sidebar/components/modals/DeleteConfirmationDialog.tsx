import { AlertTriangle } from "lucide-react";

import { ModalShell } from "@/shared/components/ModalShell";

export function DeleteConfirmationDialog({
  open,
  itemName,
  itemType,
  onClose,
  onConfirm,
}: {
  open: boolean;
  itemName: string;
  itemType: "file" | "folder";
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isFolder = itemType === "folder";

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Delete ${itemType}?`}
      description={
        isFolder
          ? `Delete ${itemName} and everything inside it?`
          : `Delete ${itemName}? This action cannot be undone.`
      }
      closeLabel={`Close delete ${itemType} dialog`}
      maxWidth="max-w-sm"
    >
      <div className="space-y-5">
        <div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            strokeWidth={1.8}
          />
          <p>
            {isFolder
              ? "All files and subfolders in this folder will be removed."
              : "You will not be able to recover this file."}
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Delete {itemType}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
