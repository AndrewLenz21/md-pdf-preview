"use client";

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribeToMount = () => () => {};
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ModalShell({
  open,
  onClose,
  title,
  description,
  closeLabel,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  closeLabel: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const mounted = useSyncExternalStore(
    subscribeToMount,
    getClientMountSnapshot,
    getServerMountSnapshot,
  );

  useLayoutEffect(() => {
    if (open) {
      const activeElement = document.activeElement;

      previouslyFocusedRef.current =
        activeElement instanceof HTMLElement ? activeElement : null;
      closeRef.current?.focus();
      return;
    }

    const activeElement = document.activeElement;

    if (
      activeElement instanceof HTMLElement &&
      shellRef.current?.contains(activeElement)
    ) {
      activeElement.blur();
      previouslyFocusedRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={shellRef}
      inert={!open}
      className={`modal-shell ${open ? "modal-shell-open" : "modal-shell-closed"} fixed inset-0 z-[300] flex items-center justify-center p-4`}
    >
      <button
        type="button"
        aria-label={closeLabel}
        className="modal-shell-backdrop absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal-shell-content relative max-h-[calc(100dvh-2rem)] w-full ${maxWidth} overflow-y-auto rounded-2xl border border-border bg-popover p-5 shadow-2xl sm:p-6`}
      >
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label={closeLabel}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}
