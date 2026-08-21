import { ModalShell } from "@/shared/components/ModalShell";
import { DialogFormFooter } from "@/shared/components/DialogFormFooter";
import { DialogTextField } from "@/shared/components/DialogTextField";
import type { DocumentFolderColor } from "@/modules/dashboard/document/model/document.types";

import {
  FOLDER_COLOR_OPTIONS,
  FOLDER_SWATCH_COLOR_CLASSES,
} from "../folderColors";

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
        <DialogTextField
          label="Folder name"
          value={name}
          maxLength={80}
          onChange={onNameChange}
          placeholder="New folder"
          autoFocus
        />

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

        <DialogFormFooter
          submitLabel="Save folder"
          disabled={!name.trim()}
          onCancel={onClose}
        />
      </form>
    </ModalShell>
  );
}
