import { ModalShell } from "@/modules/navigation/components/ModalShell";
import type { DocumentFolderColor } from "@/modules/dashboard/document/model/document.types";

import {
  FOLDER_COLOR_OPTIONS,
  FOLDER_SWATCH_COLOR_CLASSES,
} from "./folderColors";

export function FolderEditorDialog({
  open,
  title,
  name,
  color,
  onNameChange,
  onColorChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  name: string;
  color: DocumentFolderColor;
  onNameChange: (name: string) => void;
  onColorChange: (color: DocumentFolderColor) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={title}
      description="Choose a name and color for this folder."
      closeLabel="Close folder dialog"
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="block space-y-2">
          <span className="text-xs font-semibold text-foreground">
            Folder name
          </span>
          <input
            autoFocus
            value={name}
            maxLength={80}
            onChange={(event) => onNameChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="New folder"
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-foreground">
            Color
          </legend>
          <div className="flex flex-wrap gap-2">
            {FOLDER_COLOR_OPTIONS.map((option) => {
              const selected = color === option;

              return (
                <button
                  key={option}
                  type="button"
                  aria-label={`Use ${option} folder color`}
                  aria-pressed={selected}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selected ? "border-foreground/60 bg-accent" : "border-border bg-background"}`}
                  onClick={() => onColorChange(option)}
                >
                  <span
                    aria-hidden="true"
                    className={`h-4 w-4 rounded-full ${FOLDER_SWATCH_COLOR_CLASSES[option]}`}
                  />
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            Save folder
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
