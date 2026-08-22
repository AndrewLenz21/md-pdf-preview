"use client";

import { useId, useRef, useState } from "react";
import { ModalShell } from "@/shared/components/ModalShell";
import { useDismissableLayer } from "@/shared/hooks/useDismissableLayer";
import type { DocumentFolderIcon } from "@/modules/dashboard/document/model/document.types";

import {
  FOLDER_ICON_LABELS,
  FOLDER_ICON_OPTIONS,
  FolderIcon,
} from "./folderIcons";

export function FolderIconSelector({
  icon,
  mobile = false,
  onChange,
  onOpenChange,
}: {
  icon: DocumentFolderIcon;
  mobile?: boolean;
  onChange: (icon: DocumentFolderIcon) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const selectedLabel = FOLDER_ICON_LABELS[icon];

  const close = () => {
    setOpen(false);
    onOpenChange?.(false);
  };

  const toggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  useDismissableLayer({
    enabled: open && !mobile,
    refs: [rootRef],
    onDismiss: close,
  });

  const selectIcon = (nextIcon: DocumentFolderIcon) => {
    onChange(nextIcon);
    close();
  };

  const options = (
    <div className="grid grid-cols-4 gap-2">
      {FOLDER_ICON_OPTIONS.map((option) => {
        const selected = icon === option;

        return (
          <button
            key={option}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={`Use ${FOLDER_ICON_LABELS[option]} folder icon`}
            title={FOLDER_ICON_LABELS[option]}
            onClick={() => selectIcon(option)}
            className={`flex h-11 w-full items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"}`}
          >
            <FolderIcon icon={option} className="h-5 w-5" />
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-label={`Folder icon: ${selectedLabel}`}
          title={selectedLabel}
          aria-controls={mobile ? undefined : menuId}
          aria-expanded={open}
          aria-haspopup={mobile ? "dialog" : "listbox"}
          onClick={toggle}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <FolderIcon icon={icon} className="h-5 w-5" />
        </button>

        {!mobile && open ? (
          <div
            id={menuId}
            role="listbox"
            aria-label="Folder icon options"
            className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-52 rounded-lg border border-border bg-card/95 p-2 shadow-lg backdrop-blur-md"
          >
            {options}
          </div>
        ) : null}
      </div>

      {mobile ? (
        <ModalShell
          open={open}
          onClose={close}
          title="Choose folder icon"
          description="Select an icon for this folder."
          closeLabel="Close folder icon picker"
          zIndex={400}
        >
          <div role="listbox" aria-label="Folder icon options">
            {options}
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
