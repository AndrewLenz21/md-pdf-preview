"use client";

import {
  ClipboardPaste,
  Code2,
  Copy,
  Eye,
  FileText,
  Printer,
} from "lucide-react";

import type { MockDocument } from "@/modules/dashboard/document/model/document.types";
import type { DocumentEditorMode } from "@/modules/dashboard/types/editor.types";

import { PaperSizeSelect } from "./paper-preview/PaperSizeSelect";
import type { EditingActions } from "../utils/editingActions";

function EditingActionButtons({
  editingActions,
}: {
  editingActions?: EditingActions | null;
}) {
  const disabled = !editingActions;
  const runAsyncAction = (action: () => Promise<void>) => {
    void action().catch(() => undefined);
  };

  return (
    <div className="mobile-preview-toolbar-editing-actions flex items-center gap-1">
      <button
        type="button"
        title="Select all"
        aria-label="Select all"
        disabled={disabled}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => editingActions?.selectAll()}
        className="h-8 rounded-md px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
      >
        Select all
      </button>
      <button
        type="button"
        title="Copy"
        aria-label="Copy"
        disabled={disabled}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => {
          if (editingActions) {
            runAsyncAction(editingActions.copy);
          }
        }}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
      >
        <Copy className="h-3.5 w-3.5" strokeWidth={1.7} />
      </button>
      <button
        type="button"
        title="Paste"
        aria-label="Paste"
        disabled={disabled}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => {
          if (editingActions) {
            runAsyncAction(editingActions.paste);
          }
        }}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
      >
        <ClipboardPaste className="h-3.5 w-3.5" strokeWidth={1.7} />
      </button>
    </div>
  );
}

function PreviewActionButtons({
  editingActions,
}: {
  editingActions?: EditingActions | null;
}) {
  const disabled = !editingActions;

  return (
    <div className="mobile-preview-toolbar-editing-actions flex items-center gap-1">
      <button
        type="button"
        title="Print"
        aria-label="Print document"
        disabled={disabled}
        onClick={() => editingActions?.print()}
        className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
      >
        <Printer className="h-3.5 w-3.5" strokeWidth={1.7} />
        <span className="hidden sm:inline">Print</span>
      </button>
    </div>
  );
}

export function PreviewToolbar({
  document,
  mode,
  onModeChange,
  editingActions,
}: {
  document: MockDocument;
  mode: DocumentEditorMode;
  onModeChange: (mode: DocumentEditorMode) => void;
  editingActions?: EditingActions | null;
}) {
  const isPreviewMode = mode === "preview";

  return (
    <header
      data-document-control
      className="mobile-preview-toolbar sticky top-0 left-0 z-30 min-h-17 shrink-0 items-center gap-4 border-b border-border/70 bg-background/95 px-5 py-3 backdrop-blur-sm lg:px-8"
    >
      <div className="mobile-preview-toolbar-meta min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {document.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          Personal document · {document.updatedAt.toLowerCase()}
        </p>
      </div>

      <div
        className="mobile-preview-toolbar-mode flex items-center gap-0.5 rounded-md border border-border/80 bg-card/80 p-0.5"
        role="group"
        aria-label="View mode"
      >
        <button
          type="button"
          onClick={() => onModeChange("markdown")}
          aria-pressed={mode === "markdown"}
          className={`flex h-8 items-center gap-1.5 rounded px-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 ${mode === "markdown" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
        >
          <Code2 className="h-3.5 w-3.5" strokeWidth={1.7} />
          <span className="hidden sm:inline">Markdown</span>
        </button>
        <button
          type="button"
          onClick={() => onModeChange("document")}
          aria-pressed={mode === "document"}
          className={`flex h-8 items-center gap-1.5 rounded px-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 ${mode === "document" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={1.7} />
          <span className="hidden sm:inline">Document</span>
        </button>
        <button
          type="button"
          onClick={() => onModeChange("preview")}
          aria-pressed={mode === "preview"}
          className={`flex h-8 items-center gap-1.5 rounded px-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 ${mode === "preview" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
        >
          <Eye className="h-3.5 w-3.5" strokeWidth={1.7} />
          <span className="hidden sm:inline">Preview</span>
        </button>
      </div>

      <div className="mobile-preview-toolbar-right flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="mobile-preview-toolbar-paper paper-size-control-slot">
          <div
            className={`paper-size-control ${isPreviewMode ? "paper-size-control-visible" : "paper-size-control-hidden"}`}
            aria-hidden={!isPreviewMode}
          >
            <span className="hidden text-xs font-medium text-muted-foreground lg:inline">
              Paper
            </span>
            <PaperSizeSelect />
          </div>
        </div>

        {isPreviewMode ? (
          <>
            <span
              className="mobile-preview-toolbar-separator hidden h-5 w-px bg-border lg:block"
              aria-hidden="true"
            />
            <PreviewActionButtons editingActions={editingActions} />
          </>
        ) : (
          <EditingActionButtons editingActions={editingActions} />
        )}
      </div>
    </header>
  );
}
