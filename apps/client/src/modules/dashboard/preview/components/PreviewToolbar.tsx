"use client";

import {
  ClipboardPaste,
  Code2,
  Copy,
  Eye,
  FileText,
  Loader2,
  Printer,
  X,
} from "lucide-react";

import type { WorkspaceDocumentItem } from "@/modules/dashboard/document/model/document.types";
import {
  MAX_MARKDOWN_CHARACTERS,
  isWorkspaceDocument,
  useCloudWorkspaceStore,
  useLocalWorkspaceStore,
  useWorkspaceSessionStore,
} from "@/modules/dashboard/stores";
import type { DocumentEditorMode } from "@/modules/dashboard/types/editor.types";

import { PaperSizeSelect } from "./paper-preview/PaperSizeSelect";
import type { EditingActions } from "../utils/editingActions";

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return "Edited today";
  }

  return `Edited ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function EditingActionButtons({
  editingActions,
  includeClear = false,
  visible = true,
}: {
  editingActions?: EditingActions | null;
  includeClear?: boolean;
  visible?: boolean;
}) {
  const disabled = !editingActions;
  const runAsyncAction = (action: () => Promise<void>) => {
    void action().catch(() => undefined);
  };

  return (
    <div
      aria-hidden={!visible}
      className={`mobile-preview-toolbar-editing-actions mobile-preview-toolbar-select-actions flex items-center gap-1 ${visible ? "mobile-preview-toolbar-action-visible" : "mobile-preview-toolbar-action-hidden"}`}
    >
      {includeClear ? (
        <>
          <ClearSelectionButton
            className="desktop-preview-toolbar-clear"
          />
          <span
            aria-hidden="true"
            className="desktop-preview-toolbar-clear-separator text-border"
          >
            |
          </span>
        </>
      ) : null}
      <button
        type="button"
        title="Select all"
        aria-label="Select all"
        disabled={disabled}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => editingActions?.selectAll()}
        className="h-8 shrink-0 whitespace-nowrap rounded-md px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 lg:text-[11px]"
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
        <Copy className="h-4 w-4 lg:h-3.5 lg:w-3.5" strokeWidth={1.7} />
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
        <ClipboardPaste
          className="h-4 w-4 lg:h-3.5 lg:w-3.5"
          strokeWidth={1.7}
        />
      </button>
    </div>
  );
}

function ClearSelectionButton({
  className = "",
  onCleared,
}: {
  className?: string;
  onCleared?: () => void;
}) {
  const activeSource = useWorkspaceSessionStore((state) => state.activeSource);
  const selectedDocumentSource = useWorkspaceSessionStore(
    (state) => state.selectedDocumentSource,
  );
  const selectedDocumentId = useWorkspaceSessionStore(
    (state) => state.selectedDocumentId,
  );
  const clearSelection = useWorkspaceSessionStore(
    (state) => state.clearSelection,
  );
  const flushLocalPendingContent = useLocalWorkspaceStore(
    (state) => state.flushPendingContent,
  );
  const flushCloudPendingContent = useCloudWorkspaceStore(
    (state) => state.flushPendingContent,
  );
  const selectedSource = selectedDocumentSource ?? activeSource;

  return (
    <button
      type="button"
      title="Clear"
      aria-label="Clear"
      onClick={() => {
        if (selectedDocumentId) {
          (selectedSource === "local"
            ? flushLocalPendingContent
            : flushCloudPendingContent)(selectedDocumentId);
        }

        clearSelection();
        onCleared?.();
      }}
      className={`mobile-preview-toolbar-clear-action mobile-preview-toolbar-action-visible flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive/40 lg:text-[11px] ${className}`}
    >
      <X className="h-3.5 w-3.5" strokeWidth={1.8} />
      <span className="mobile-preview-toolbar-clear-label">Clear</span>
    </button>
  );
}

export function PreviewActionButtons({
  editingActions,
  hideOnDesktop = false,
  visible = true,
}: {
  editingActions?: EditingActions | null;
  hideOnDesktop?: boolean;
  visible?: boolean;
}) {
  const disabled = !editingActions;

  return (
    <div
      aria-hidden={!visible}
      className={`mobile-preview-toolbar-editing-actions flex items-center gap-1 ${hideOnDesktop ? "mobile-preview-toolbar-print-action" : ""} ${visible ? "mobile-preview-toolbar-action-visible" : "mobile-preview-toolbar-action-hidden"}`}
    >
      <button
        type="button"
        title="Print"
        aria-label="Print document"
        disabled={disabled}
        onClick={() => editingActions?.print()}
        className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 lg:text-[11px]"
      >
        <Printer className="h-4 w-4 lg:h-3.5 lg:w-3.5" strokeWidth={1.7} />
        <span className="hidden sm:inline">Print</span>
      </button>
    </div>
  );
}

export function PreviewPaneToolbar({
  editingActions,
}: {
  editingActions?: EditingActions | null;
}) {
  return (
    <header
      data-document-control
      className="desktop-preview-pane-toolbar relative z-50 flex h-14 shrink-0 items-center justify-end overflow-visible border-y border-border/80 bg-card/80 px-4 shadow-lg backdrop-blur-sm lg:px-6"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <PaperSizeSelect />
        <PreviewActionButtons editingActions={editingActions} />
      </div>
    </header>
  );
}

export function PreviewToolbar({
  document,
  mode,
  onModeChange,
  editingActions,
  splitMode = false,
  onMobileClear,
}: {
  document: WorkspaceDocumentItem;
  mode: DocumentEditorMode;
  onModeChange: (mode: DocumentEditorMode) => void;
  editingActions?: EditingActions | null;
  splitMode?: boolean;
  onMobileClear?: () => void;
}) {
  const isPreviewMode = mode === "preview";
  const activeSource = useWorkspaceSessionStore((state) => state.activeSource);
  const selectedDocumentSource = useWorkspaceSessionStore(
    (state) => state.selectedDocumentSource,
  );
  const selectedSource = selectedDocumentSource ?? activeSource;
  const hasCharacterLimit = selectedSource === "cloud";
  const localPendingContent = useLocalWorkspaceStore(
    (state) => state.pendingContentByDocumentId[document.id],
  );
  const cloudPendingContent = useCloudWorkspaceStore(
    (state) => state.pendingContentByDocumentId[document.id],
  );
  const cloudIsSaving = useCloudWorkspaceStore(
    (state) => state.savingDocumentIds[document.id] === true,
  );
  const localDocumentContent = useLocalWorkspaceStore(
    (state) =>
      state.items.find(
        (item): item is WorkspaceDocumentItem =>
          isWorkspaceDocument(item) && item.id === document.id,
      )?.content,
  );
  const cloudDocumentContent = useCloudWorkspaceStore(
    (state) =>
      state.items.find(
        (item): item is WorkspaceDocumentItem =>
          isWorkspaceDocument(item) && item.id === document.id,
      )?.content,
  );
  const markdownCharacterCount =
    (selectedSource === "local"
      ? (localPendingContent ?? localDocumentContent)
      : (cloudPendingContent ?? cloudDocumentContent)
    )?.length ?? 0;

  const isAtCharacterLimit =
    hasCharacterLimit && markdownCharacterCount >= MAX_MARKDOWN_CHARACTERS;
  const isSavingToCloud = selectedSource === "cloud" && cloudIsSaving;

  return (
    <header
      data-document-control
      className="mobile-preview-toolbar sticky top-0 left-0 z-30 min-h-17 shrink-0 items-center gap-4 border-b border-border/70 bg-background/95 px-5 py-3 backdrop-blur-sm lg:px-8"
    >
      <div className="mobile-preview-toolbar-meta min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {document.name}
        </p>
        {isSavingToCloud ? (
          <p
            aria-live="polite"
            className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span>Saving to cloud...</span>
          </p>
        ) : (
          <p className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">
              {formatUpdatedAt(document.updated_at)}
            </span>
            <span
              className={`shrink-0 tabular-nums ${isAtCharacterLimit ? "font-semibold text-destructive" : ""}`}
              title="Markdown character count"
            >
              {markdownCharacterCount.toLocaleString()}
              {hasCharacterLimit
                ? ` / ${MAX_MARKDOWN_CHARACTERS.toLocaleString()}`
              : null}
            </span>
          </p>
        )}
      </div>

      <div
        className="mobile-preview-toolbar-mode flex items-center gap-0.5 rounded-md border border-border/80 bg-card/80 p-0 lg:p-0.5"
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
        {!isPreviewMode && !isSavingToCloud ? (
          <ClearSelectionButton
            className="mobile-preview-toolbar-mobile-clear"
            onCleared={onMobileClear}
          />
        ) : null}
        <div
          className={`mobile-preview-toolbar-paper paper-size-control-slot ${isPreviewMode ? "mobile-preview-toolbar-paper-action" : ""}`}
        >
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
          <span
            className="mobile-preview-toolbar-separator hidden h-5 w-px bg-border lg:block"
            aria-hidden="true"
          />
        ) : null}
        <PreviewActionButtons
          editingActions={editingActions}
          hideOnDesktop
          visible={isPreviewMode}
        />
        <EditingActionButtons
          editingActions={editingActions}
          includeClear={!isPreviewMode && !isSavingToCloud}
          visible={!isPreviewMode || splitMode}
        />
      </div>
    </header>
  );
}
