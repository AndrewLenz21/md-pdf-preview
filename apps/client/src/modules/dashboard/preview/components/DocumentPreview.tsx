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

import { useDocumentStore, useWorkspaceStore } from "@/modules/dashboard/stores";
import type { MockDocument } from "@/modules/dashboard/document/model/document.types";
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

function getRootClassName(mode: DocumentEditorMode, embedded: boolean) {
  switch (mode) {
    case "preview":
      return "document-preview-root document-preview-paper-root relative flex h-[calc(100dvh-5rem)] min-h-0 flex-col overflow-hidden lg:h-full";
    case "markdown":
      return embedded
        ? "document-preview-root document-markdown-root relative flex h-full min-h-0 flex-col overflow-hidden"
        : "document-preview-root document-markdown-root relative min-h-[calc(100dvh-5rem)]";
    case "document":
      return embedded
        ? "document-preview-root document-editor-root relative flex h-full min-h-0 flex-col overflow-hidden"
        : "document-preview-root document-editor-root relative min-h-[calc(100dvh-5rem)]";
  }
}

function getCanvasClassName(mode: DocumentEditorMode, embedded: boolean) {
  switch (mode) {
    case "preview":
      return "document-preview-canvas min-h-0 flex-1 overflow-auto bg-muted/40";
    case "markdown":
      return embedded
        ? "document-preview-canvas document-continuous-canvas min-h-0 flex-1 overflow-auto"
        : "document-preview-canvas document-continuous-canvas";
    case "document":
      return embedded
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
  modeTransitionDirection = null,
  embedded = false,
  showToolbar = true,
  disableScrollSync = false,
  onEditingActionsChange,
  scrollContainerRef,
  pageBreakMarkers,
}: {
  document: MockDocument;
  mode: DocumentEditorMode;
  scrollScope: DocumentPreviewScrollScope;
  onModeChange: (mode: DocumentEditorMode) => void;
  onContentChange: (content: string) => void;
  modeTransitionDirection?: "forward" | "backward" | null;
  embedded?: boolean;
  showToolbar?: boolean;
  disableScrollSync?: boolean;
  onEditingActionsChange?: (actions: EditingActions | null) => void;
  scrollContainerRef?: MutableRefObject<HTMLDivElement | null>;
  pageBreakMarkers?: number[];
}) {
  const paperSize = useWorkspaceStore((state) => state.paperSize);
  const pendingContent = useDocumentStore(
    (state) => state.pendingContentByDocumentId[document.id],
  );
  const { zoom } = useModeZoom(mode);
  const paperDimensions = getPaperDimensions(mode, paperSize, zoom);
  const storedMarkdown = pendingContent ?? document.content ?? "";
  const markdown = storedMarkdown;
  const previewRootRef = useRef<HTMLDivElement>(null);
  const documentEditorRef = useRef<Editor | null>(null);
  const markdownEditorRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const previousEmbeddedRef = useRef(embedded);
  const modeRef = useRef(mode);
  const markdownRef = useRef(markdown);
  const onContentChangeRef = useRef(onContentChange);
  const [editingActions, setEditingActions] =
    useState<EditingActions | null>(null);
  const usesCanvasScroll = mode === "preview" || embedded;

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

  useLayoutEffect(() => {
    if (disableScrollSync || !isActiveScrollScope(scrollScope)) {
      return;
    }

    const key = `${scrollScope}:${document.id}:${mode}`;
    const canvas = canvasRef.current;
    const previousEmbedded = previousEmbeddedRef.current;
    previousEmbeddedRef.current = embedded;
    let firstFrame: number | null = null;
    let secondFrame: number | null = null;

    if (previousEmbedded && !embedded) {
      const scrollTop = canvas?.scrollTop ?? window.scrollY;

      window.scrollTo({ top: scrollTop, behavior: "auto" });
      writeScrollPosition(key, {
        windowTop: scrollTop,
        canvasTop: scrollTop,
      });
    } else if (!previousEmbedded && embedded && canvas) {
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

  return (
    <div
      ref={previewRootRef}
      className={getRootClassName(mode, embedded)}
      data-document-mode={mode}
      style={getRootStyle(mode, paperDimensions)}
    >
      <style media="print">{getPrintPageRule(mode, paperDimensions)}</style>
      <div
        ref={(element) => {
          canvasRef.current = element;

          if (scrollContainerRef) {
            scrollContainerRef.current = element;
          }
        }}
        className={getCanvasClassName(mode, embedded)}
      >
        {showToolbar ? (
          <PreviewToolbar
            document={document}
            mode={mode}
            onModeChange={onModeChange}
            editingActions={editingActions}
          />
        ) : null}
        {mode === "document" && pageBreakMarkers ? (
          <DocumentPageBreakOverlay positions={pageBreakMarkers} />
        ) : null}

        <div ref={stageRef} className={getStageClassName(mode)}>
          <div
            className={`w-full ${modeTransitionDirection ? `dashboard-mobile-section dashboard-mobile-section-${modeTransitionDirection}` : ""}`}
          >
            <ModeContent
              mode={mode}
              documentTitle={document.title}
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
