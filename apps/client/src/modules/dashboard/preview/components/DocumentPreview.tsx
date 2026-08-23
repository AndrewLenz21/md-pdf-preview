"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
} from "react";
import type { Editor } from "@tiptap/core";
import { Loader2 } from "lucide-react";

import {
  useCloudWorkspaceStore,
  useLocalWorkspaceStore,
  useWorkspaceSessionStore,
  useWorkspaceStore,
} from "@/modules/dashboard/stores";
import type { WorkspaceDocumentItem } from "@/modules/dashboard/document/model/document.types";
import type { DocumentEditorMode } from "@/modules/dashboard/types/editor.types";

import { MarkdownSourceEditor } from "./MarkdownSourceEditor";
import { DocumentPageBreakOverlay } from "./DocumentPageBreakOverlay";
import { DocumentEditor } from "./document-editor/DocumentEditor";
import { PreviewToolbar } from "./PreviewToolbar";
import {
  PaperPreview,
  getPaperPreviewDimensions,
  type PaperPreviewDimensions,
} from "./paper-preview";
import {
  createEditingActions,
  type EditingActions,
} from "../utils/editingActions";
import { useModeZoom } from "../hooks/useModeZoom";

type DocumentPreviewScrollScope = "desktop" | "mobile";

type ScrollPosition = {
  windowTop: number;
  canvasTop: number;
};

const scrollPositions = new Map<string, ScrollPosition>();
const SCROLL_STORAGE_PREFIX = "md-pdf-preview:scroll:";

function readScrollPosition(key: string) {
  const memoryPosition = scrollPositions.get(key);

  if (memoryPosition) {
    return memoryPosition;
  }

  try {
    const storedPosition = sessionStorage.getItem(
      `${SCROLL_STORAGE_PREFIX}${key}`,
    );

    if (!storedPosition) {
      return undefined;
    }

    const position = JSON.parse(storedPosition) as ScrollPosition;

    if (
      Number.isFinite(position.windowTop) &&
      Number.isFinite(position.canvasTop)
    ) {
      scrollPositions.set(key, position);
      return position;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function writeScrollPosition(key: string, position: ScrollPosition) {
  scrollPositions.set(key, position);

  try {
    sessionStorage.setItem(
      `${SCROLL_STORAGE_PREFIX}${key}`,
      JSON.stringify(position),
    );
  } catch {
    // Scroll restoration still works for the current mount via the memory map.
  }
}

function isActiveScrollScope(scope: DocumentPreviewScrollScope) {
  if (typeof window.matchMedia !== "function") {
    return true;
  }

  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;

  return scope === "desktop" ? isDesktop : !isDesktop;
}

function getPaperDimensions(
  mode: DocumentEditorMode,
  paperSize: Parameters<typeof getPaperPreviewDimensions>[0],
  zoom: number,
) {
  switch (mode) {
    case "preview":
      return getPaperPreviewDimensions(paperSize, zoom);
    case "markdown":
    case "document":
      return null;
  }
}

function getRootClassName(mode: DocumentEditorMode, contained: boolean) {
  switch (mode) {
    case "preview":
      return contained
        ? "document-preview-root document-preview-paper-root relative flex h-[calc(100dvh-5rem)] min-h-0 flex-col overflow-hidden lg:h-full"
        : "document-preview-root document-preview-paper-root relative min-h-[calc(100dvh-5rem)] overflow-visible";
    case "markdown":
      return contained
        ? "document-preview-root document-markdown-root relative flex h-full min-h-0 flex-col overflow-hidden"
        : "document-preview-root document-markdown-root relative min-h-[calc(100dvh-5rem)]";
    case "document":
      return contained
        ? "document-preview-root document-editor-root relative flex h-full min-h-0 flex-col overflow-hidden"
        : "document-preview-root document-editor-root relative min-h-[calc(100dvh-5rem)]";
  }
}

function getCanvasClassName(mode: DocumentEditorMode, contained: boolean) {
  switch (mode) {
    case "preview":
      return contained
        ? "document-preview-canvas min-h-0 flex-1 overflow-auto bg-muted/40 pt-5"
        : "document-preview-canvas overflow-visible bg-muted/40 pt-5";
    case "markdown":
      return contained
        ? "document-preview-canvas document-continuous-canvas min-h-0 flex-1 overflow-auto"
        : "document-preview-canvas document-continuous-canvas";
    case "document":
      return contained
        ? "document-preview-canvas document-continuous-canvas relative min-h-0 flex-1 overflow-auto"
        : "document-preview-canvas document-continuous-canvas relative";
  }
}

function getStageClassName(mode: DocumentEditorMode) {
  switch (mode) {
    case "markdown":
      return "document-markdown-stage";
    case "document":
      return "document-editor-stage";
    case "preview":
      return "document-screen-content document-preview-stage min-h-full min-w-full px-4 pt-8 pb-44 sm:px-8 sm:pt-8 sm:pb-40 lg:px-12 lg:py-12";
  }
}

function getRootStyle(
  mode: DocumentEditorMode,
  paperDimensions: PaperPreviewDimensions | null,
): CSSProperties | undefined {
  if (mode !== "preview" || !paperDimensions) {
    return undefined;
  }

  return {
    "--document-print-width": paperDimensions.printWidth,
    "--document-print-height": paperDimensions.printHeight,
  } as CSSProperties;
}

function getPrintPageRule(
  mode: DocumentEditorMode,
  paperDimensions: PaperPreviewDimensions | null,
) {
  if (mode !== "preview" || !paperDimensions) {
    return "";
  }

  return `@page { size: ${paperDimensions.printWidth} ${paperDimensions.printHeight}; margin: 0; }`;
}

function ModeContent({
  mode,
  documentTitle,
  markdown,
  zoom,
  markdownEditorRef,
  documentEditorRef,
  paperDimensions,
  onContentChange,
}: {
  mode: DocumentEditorMode;
  documentTitle: string;
  markdown: string;
  zoom: number;
  markdownEditorRef: React.RefObject<HTMLTextAreaElement | null>;
  documentEditorRef: React.RefObject<Editor | null>;
  paperDimensions: PaperPreviewDimensions | null;
  onContentChange: (content: string) => void;
}) {
  switch (mode) {
    case "markdown":
      return (
        <MarkdownSourceEditor
          documentTitle={documentTitle}
          markdown={markdown}
          zoom={zoom}
          textareaRef={markdownEditorRef}
          onMarkdownChange={onContentChange}
        />
      );
    case "document":
      return (
        <DocumentEditor
          markdown={markdown}
          zoom={zoom}
          editorRef={documentEditorRef}
          onMarkdownChange={onContentChange}
        />
      );
    case "preview":
      if (!paperDimensions) {
        return null;
      }

      return (
        <PaperPreview
          documentTitle={documentTitle}
          markdown={markdown}
          paperDimensions={paperDimensions}
        />
      );
  }
}

export function DocumentPreview({
  document,
  mode,
  scrollScope,
  onModeChange,
  onContentChange,
  onMobileClear,
  modeTransitionDirection = null,
  embedded = false,
  showToolbar = true,
  disableScrollSync = false,
  onEditingActionsChange,
  scrollContainerRef,
  pageBreakMarkers,
}: {
  document: WorkspaceDocumentItem;
  mode: DocumentEditorMode;
  scrollScope: DocumentPreviewScrollScope;
  onModeChange: (mode: DocumentEditorMode) => void;
  onContentChange: (content: string) => void;
  onMobileClear?: () => void;
  modeTransitionDirection?: "forward" | "backward" | null;
  embedded?: boolean;
  showToolbar?: boolean;
  disableScrollSync?: boolean;
  onEditingActionsChange?: (actions: EditingActions | null) => void;
  scrollContainerRef?: MutableRefObject<HTMLDivElement | null>;
  pageBreakMarkers?: number[];
}) {
  const paperSize = useWorkspaceStore((state) => state.paperSize);
  const activeSource = useWorkspaceSessionStore((state) => state.activeSource);
  const selectedDocumentSource = useWorkspaceSessionStore(
    (state) => state.selectedDocumentSource,
  );
  const documentSource = selectedDocumentSource ?? activeSource;
  const localPendingContent = useLocalWorkspaceStore(
    (state) => state.pendingContentByDocumentId[document.id],
  );
  const cloudPendingContent = useCloudWorkspaceStore(
    (state) => state.pendingContentByDocumentId[document.id],
  );
  const cloudContentLoaded = useCloudWorkspaceStore(
    (state) => state.contentLoadedByDocumentId[document.id] === true,
  );
  const cloudContentLoading = useCloudWorkspaceStore(
    (state) => state.contentLoadingByDocumentId[document.id] === true,
  );
  const cloudContentError = useCloudWorkspaceStore(
    (state) => state.contentErrorByDocumentId[document.id],
  );
  const loadCloudDocumentContent = useCloudWorkspaceStore(
    (state) => state.loadDocumentContent,
  );
  const pendingContent =
    documentSource === "local" ? localPendingContent : cloudPendingContent;
  const { zoom } = useModeZoom(mode);
  const paperDimensions = getPaperDimensions(mode, paperSize, zoom);
  const storedMarkdown = pendingContent ?? document.content ?? "";
  const markdown = storedMarkdown;
  const previewRootRef = useRef<HTMLDivElement>(null);
  const documentEditorRef = useRef<Editor | null>(null);
  const markdownEditorRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const usesCanvasScroll = embedded || disableScrollSync;
  const usesFixedMobileToolbar =
    showToolbar && mode === "preview" && !usesCanvasScroll;
  const previousCanvasScrollRef = useRef(usesCanvasScroll);
  const modeRef = useRef(mode);
  const markdownRef = useRef(markdown);
  const onContentChangeRef = useRef(onContentChange);
  const [editingActions, setEditingActions] = useState<EditingActions | null>(
    null,
  );
  const handleContentChange = (nextMarkdown: string) => {
    onContentChange(nextMarkdown);
  };

  useEffect(() => {
    modeRef.current = mode;
    markdownRef.current = markdown;
    onContentChangeRef.current = onContentChange;
  }, [mode, markdown, onContentChange]);

  useEffect(() => {
    const actions = createEditingActions({
      modeRef,
      markdownRef,
      markdownEditorRef,
      documentEditorRef,
      onMarkdownChangeRef: onContentChangeRef,
    });

    setEditingActions(actions);
    onEditingActionsChange?.(actions);

    return () => onEditingActionsChange?.(null);
  }, [onEditingActionsChange]);

  useEffect(() => {
    if (
      documentSource !== "cloud" ||
      cloudContentLoaded ||
      cloudContentError
    ) {
      return;
    }

    void loadCloudDocumentContent(document.id).catch(() => undefined);
  }, [
    cloudContentError,
    cloudContentLoaded,
    documentSource,
    document.id,
    loadCloudDocumentContent,
  ]);

  useLayoutEffect(() => {
    if (disableScrollSync || !isActiveScrollScope(scrollScope)) {
      return;
    }

    const key = `${scrollScope}:${document.id}:${mode}`;
    const canvas = canvasRef.current;
    const previousUsesCanvasScroll = previousCanvasScrollRef.current;
    previousCanvasScrollRef.current = usesCanvasScroll;
    let firstFrame: number | null = null;
    let secondFrame: number | null = null;

    if (previousUsesCanvasScroll && !usesCanvasScroll) {
      const scrollTop = canvas?.scrollTop ?? window.scrollY;

      window.scrollTo({ top: scrollTop, behavior: "auto" });
      writeScrollPosition(key, {
        windowTop: scrollTop,
        canvasTop: scrollTop,
      });
    } else if (!previousUsesCanvasScroll && usesCanvasScroll && canvas) {
      const scrollTop = window.scrollY;

      canvas.scrollTop = scrollTop;
      writeScrollPosition(key, {
        windowTop: scrollTop,
        canvasTop: scrollTop,
      });
    }

    const restore = () => {
      const savedPosition = readScrollPosition(key);

      if (!savedPosition) {
        return;
      }

      if (usesCanvasScroll) {
        if (canvas) {
          canvas.scrollTop = savedPosition.canvasTop;
        }
      } else {
        window.scrollTo({ top: savedPosition.windowTop, behavior: "auto" });
      }
    };

    const save = () => {
      const position = {
        windowTop: window.scrollY,
        canvasTop: canvas?.scrollTop ?? 0,
      };

      writeScrollPosition(key, position);
    };

    window.addEventListener("scroll", save, { passive: true });
    canvas?.addEventListener("scroll", save, { passive: true });

    firstFrame = window.requestAnimationFrame(() => {
      restore();
      secondFrame = window.requestAnimationFrame(restore);
    });

    const resizeObserver =
      usesCanvasScroll && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(restore)
        : null;
    if (resizeObserver) {
      if (canvas) {
        resizeObserver.observe(canvas);
      }

      if (stageRef.current) {
        resizeObserver.observe(stageRef.current);
      }
    }

    return () => {
      save();
      window.removeEventListener("scroll", save);
      canvas?.removeEventListener("scroll", save);
      resizeObserver?.disconnect();

      if (firstFrame !== null) {
        window.cancelAnimationFrame(firstFrame);
      }

      if (secondFrame !== null) {
        window.cancelAnimationFrame(secondFrame);
      }
    };
  }, [
    disableScrollSync,
    document.id,
    embedded,
    mode,
    scrollScope,
    usesCanvasScroll,
  ]);

  if (
    documentSource === "cloud" &&
    !cloudContentLoaded &&
    (cloudContentLoading || !cloudContentError)
  ) {
    return (
      <div
        className={getRootClassName(mode, usesCanvasScroll)}
        data-document-mode={mode}
        style={getRootStyle(mode, paperDimensions)}
      >
        {showToolbar ? (
          <PreviewToolbar
            document={document}
            mode={mode}
            onModeChange={onModeChange}
            onMobileClear={onMobileClear}
            editingActions={null}
          />
        ) : null}
        <div className={getCanvasClassName(mode, usesCanvasScroll)}>
          <div className={`${getStageClassName(mode)} flex min-h-full items-center justify-center`}>
            <div className="flex flex-col items-center gap-3 px-6 text-center text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              Loading cloud document...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    documentSource === "cloud" &&
    !cloudContentLoaded &&
    cloudContentError
  ) {
    return (
      <div
        className={getRootClassName(mode, usesCanvasScroll)}
        data-document-mode={mode}
        style={getRootStyle(mode, paperDimensions)}
      >
        {showToolbar ? (
          <PreviewToolbar
            document={document}
            mode={mode}
            onModeChange={onModeChange}
            onMobileClear={onMobileClear}
            editingActions={null}
          />
        ) : null}
        <div className={getCanvasClassName(mode, usesCanvasScroll)}>
          <div className={`${getStageClassName(mode)} flex min-h-full items-center justify-center`}>
            <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center text-sm text-muted-foreground">
              <p>Unable to load this cloud document.</p>
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                onClick={() =>
                  void loadCloudDocumentContent(document.id).catch(
                    () => undefined,
                  )
                }
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={previewRootRef}
      className={`${getRootClassName(mode, usesCanvasScroll)} ${usesFixedMobileToolbar ? "document-preview-mobile-toolbar-fixed" : ""}`}
      data-document-mode={mode}
      style={getRootStyle(mode, paperDimensions)}
    >
      <style media="print">{getPrintPageRule(mode, paperDimensions)}</style>
      {showToolbar ? (
        <PreviewToolbar
          document={document}
          mode={mode}
          onModeChange={onModeChange}
          onMobileClear={onMobileClear}
          editingActions={editingActions}
        />
      ) : null}
      <div
        ref={(element) => {
          canvasRef.current = element;

          if (scrollContainerRef) {
            scrollContainerRef.current = element;
          }
        }}
        className={getCanvasClassName(mode, usesCanvasScroll)}
      >
        {mode === "document" && pageBreakMarkers ? (
          <DocumentPageBreakOverlay positions={pageBreakMarkers} />
        ) : null}

        <div ref={stageRef} className={getStageClassName(mode)}>
          <div
            className={`w-full ${modeTransitionDirection ? `dashboard-mobile-section dashboard-mobile-section-${modeTransitionDirection}` : ""}`}
          >
            <ModeContent
              mode={mode}
              documentTitle={document.name}
              markdown={markdown}
              zoom={zoom}
              markdownEditorRef={markdownEditorRef}
              documentEditorRef={documentEditorRef}
              paperDimensions={paperDimensions}
              onContentChange={handleContentChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
