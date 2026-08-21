import { ModalShell } from "@/shared/components/ModalShell";

import type { DocumentFolderOption } from "../DocumentItem";

export function DocumentMoveDialog({
  open,
  displayTitle,
  folderId,
  folderOptions,
  onClose,
  onMove,
}: {
  open: boolean;
  displayTitle: string;
  folderId: string | null;
  folderOptions: DocumentFolderOption[];
  onClose: () => void;
  onMove: (folderId: string | null) => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Move file"
      description={`Choose a destination for ${displayTitle}.`}
      closeLabel="Close move dialog"
      maxWidth="max-w-sm"
    >
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {folderOptions.map((option) => {
          const current = option.id === folderId;

          return (
            <button
              key={option.id ?? "root"}
              type="button"
              disabled={current}
              className={`flex w-full items-center rounded-xl px-3 py-3 text-left text-sm transition-colors ${current ? "cursor-default bg-accent/60 font-semibold text-foreground" : "font-medium text-muted-foreground hover:bg-accent hover:text-foreground"}`}
              style={{ paddingLeft: `${12 + option.depth * 12}px` }}
              onClick={() => {
                onMove(option.id);
                onClose();
              }}
            >
              <span className="min-w-0 truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}
