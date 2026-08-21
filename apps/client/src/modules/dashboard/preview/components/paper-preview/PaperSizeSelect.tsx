"use client";

import { useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { useDismissableLayer } from "@/shared/hooks/useDismissableLayer";
import { PAPER_SIZE_OPTIONS } from "./paper-sizes";
import { useWorkspaceStore } from "@/modules/dashboard/stores";

export function PaperSizeSelect() {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const paperSize = useWorkspaceStore((state) => state.paperSize);
  const setPaperSize = useWorkspaceStore((state) => state.setPaperSize);
  const [open, setOpen] = useState(false);
  const selectedIndex = PAPER_SIZE_OPTIONS.findIndex(
    (option) => option.value === paperSize,
  );
  const selectedOption = PAPER_SIZE_OPTIONS[selectedIndex];

  useDismissableLayer({
    enabled: open,
    refs: [rootRef],
    onDismiss: () => setOpen(false),
  });

  const selectOption = (index: number) => {
    setPaperSize(PAPER_SIZE_OPTIONS[index].value);
    setOpen(false);
  };

  const moveSelection = (direction: 1 | -1) => {
    const nextIndex =
      (selectedIndex + direction + PAPER_SIZE_OPTIONS.length) %
      PAPER_SIZE_OPTIONS.length;

    setPaperSize(PAPER_SIZE_OPTIONS[nextIndex].value);
  };

  const handleTriggerKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((value) => !value);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      if (!open) {
        setOpen(true);
        return;
      }

      moveSelection(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();

      if (open) {
        const nextIndex =
          event.key === "Home" ? 0 : PAPER_SIZE_OPTIONS.length - 1;
        selectOption(nextIndex);
      }
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleTriggerKeyDown}
        aria-label="Paper size"
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="paper-size-trigger flex h-10 min-w-20 items-center justify-between gap-3 rounded-md border border-border/80 bg-card/80 px-3 text-sm font-semibold text-foreground transition-[border-color,background-color,outline-color] duration-200 ease-out hover:border-primary/35 hover:bg-card focus-visible:border-primary/70 focus-visible:bg-background focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary/30 focus-visible:outline-offset-1 focus-visible:shadow-none"
      >
        <span>{selectedOption.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
          strokeWidth={1.7}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="listbox"
          aria-label="Paper size options"
          className="paper-size-menu absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 rounded-lg border border-border bg-card/95 p-1.5 shadow-lg backdrop-blur-md"
        >
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Paper size
          </p>
          <div className="space-y-0.5">
            {PAPER_SIZE_OPTIONS.map((option, index) => {
              const selected = option.value === paperSize;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectOption(index)}
                  className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 ${selected ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {option.dimensions}
                    </span>
                  </span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center text-primary transition-[transform,opacity] duration-200 ${selected ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
                    aria-hidden="true"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
