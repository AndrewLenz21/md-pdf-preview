import { useState } from "react";

import { ModalShell } from "@/shared/components/ModalShell";
import { DialogFormFooter } from "@/shared/components/DialogFormFooter";
import { DialogTextField } from "@/shared/components/DialogTextField";
import type {
  DocumentFolderColor,
  DocumentFolderIcon,
} from "@/modules/dashboard/document/model/document.types";

import {
  FOLDER_COLOR_OPTIONS,
  FOLDER_SWATCH_COLOR_CLASSES,
} from "../folderColors";
import { FolderIconSelector } from "../FolderIconSelector";

export function FolderEditorDialog({
  open,
  title,
  name,
  color,
  icon,
  mobile = false,
  onNameChange,
  onColorChange,
  onIconChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  name: string;
  color: DocumentFolderColor;
  icon: DocumentFolderIcon;
  mobile?: boolean;
  onNameChange: (name: string) => void;
  onColorChange: (color: DocumentFolderColor) => void;
  onIconChange: (icon: DocumentFolderIcon) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={title}
      description="Choose a name, icon, and color for this folder."
      closeLabel="Close folder dialog"
      closeOnEscape={!iconPickerOpen}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex items-end gap-3">
          <FolderIconSelector
            icon={icon}
            mobile={mobile}
            onChange={onIconChange}
            onOpenChange={setIconPickerOpen}
          />
          <div className="min-w-0 flex-1">
            <DialogTextField
              label="Folder name"
              value={name}
              maxLength={200}
              onChange={onNameChange}
              placeholder="New folder"
              autoFocus
            />
          </div>
        </div>

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
