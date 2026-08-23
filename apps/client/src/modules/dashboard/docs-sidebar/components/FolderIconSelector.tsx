"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { ModalShell } from "@/shared/components/ModalShell";
import { useDismissableLayer } from "@/shared/hooks/useDismissableLayer";
import type {
  DocumentFolderColor,
  DocumentFolderIcon,
} from "@/modules/dashboard/document/model/document.types";

import {
  FOLDER_ICON_COLOR_CLASSES,
} from "./folderColors";
import {
  FOLDER_ICON_LABELS,
  FOLDER_ICON_OPTIONS,
  FolderIcon,
} from "./folderIcons";

type PopoverPosition = {
  left: number;
  top: number;
};

export function FolderIconSelector({
  icon,
  color = "primary",
  mobile = false,
  onChange,
  onOpenChange,
}: {
  icon: DocumentFolderIcon;
  color?: DocumentFolderColor;
  mobile?: boolean;
  onChange: (icon: DocumentFolderIcon) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const selectedLabel = FOLDER_ICON_LABELS[icon];

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== undefined) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
  }, []);

  const close = () => {
    clearCloseTimer();
    setOpen(false);
    setMenuClosing(true);
    onOpenChange?.(false);
    closeTimerRef.current = window.setTimeout(() => {
      setMenuClosing(false);
      closeTimerRef.current = undefined;
    }, 180);
  };

  const toggle = () => {
    if (open) {
      close();
      return;
    }

    clearCloseTimer();
    setMenuClosing(false);
    setOpen(true);
    setPosition(null);
    onOpenChange?.(true);
  };

  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  useDismissableLayer({
    enabled: open && !mobile,
    refs: [rootRef, popoverRef],
    onDismiss: close,
  });

  useLayoutEffect(() => {
    if (!open || mobile) {
      return;
    }

    const trigger = triggerRef.current;
    const popover = popoverRef.current;

    if (!trigger || !popover) {
      return;
    }

    const viewportGap = 8;
    const updatePosition = () => {
      const triggerRect = trigger.getBoundingClientRect();
      const popoverWidth = popover.offsetWidth;
      const popoverHeight = popover.offsetHeight;
      const maxLeft = Math.max(
        viewportGap,
        window.innerWidth - popoverWidth - viewportGap,
      );
      const maxTop = Math.max(
        viewportGap,
        window.innerHeight - popoverHeight - viewportGap,
      );
      const preferredTop = triggerRect.bottom + viewportGap;
      const fallbackTop = triggerRect.top - popoverHeight - viewportGap;
      const nextTop =
        preferredTop <= maxTop
          ? preferredTop
          : Math.max(viewportGap, Math.min(fallbackTop, maxTop));

      setPosition({
        left: Math.min(Math.max(triggerRect.left, viewportGap), maxLeft),
        top: nextTop,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updatePosition);
    resizeObserver?.observe(popover);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      resizeObserver?.disconnect();
    };
  }, [open, mobile]);

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
            className={`flex h-11 w-full items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${selected ? `border-primary bg-primary/10 ${FOLDER_ICON_COLOR_CLASSES[color]}` : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"}`}
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
          ref={triggerRef}
          type="button"
          aria-label={`Folder icon: ${selectedLabel}`}
          title={selectedLabel}
          aria-controls={mobile ? undefined : menuId}
          aria-expanded={open}
          aria-haspopup={mobile ? "dialog" : "listbox"}
          onClick={toggle}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${FOLDER_ICON_COLOR_CLASSES[color]}`}
        >
          <FolderIcon icon={icon} className="h-5 w-5" />
        </button>

        {!mobile && (open || menuClosing)
          ? createPortal(
              <div
                ref={popoverRef}
                id={menuId}
                role="listbox"
                aria-label="Folder icon options"
                className={`${menuClosing ? "workspace-menu-popover-exit" : "workspace-menu-popover-enter"} fixed z-[400] w-52 rounded-lg border border-border bg-card/95 p-2 shadow-lg backdrop-blur-md`}
                style={{
                  left: position?.left ?? 0,
                  top: position?.top ?? 0,
                  visibility: position ? "visible" : "hidden",
                  transformOrigin: "top left",
                }}
              >
                {options}
              </div>,
              document.body,
            )
          : null}
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
