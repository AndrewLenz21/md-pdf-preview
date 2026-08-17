"use client";

import {
  useDocumentEditorStore,
  useWorkspaceStore,
} from "@/modules/dashboard/stores";
import type { DocumentEditorMode } from "@/modules/dashboard/types/editor.types";

type ZoomControls = {
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

export function useModeZoom(mode: DocumentEditorMode): ZoomControls {
  const markdownZoom = useWorkspaceStore((state) => state.markdownZoom);
  const setMarkdownZoom = useWorkspaceStore((state) => state.setMarkdownZoom);
  const markdownZoomIn = useWorkspaceStore((state) => state.markdownZoomIn);
  const markdownZoomOut = useWorkspaceStore((state) => state.markdownZoomOut);
  const previewZoom = useWorkspaceStore((state) => state.previewZoom);
  const setPreviewZoom = useWorkspaceStore((state) => state.setPreviewZoom);
  const previewZoomIn = useWorkspaceStore((state) => state.previewZoomIn);
  const previewZoomOut = useWorkspaceStore((state) => state.previewZoomOut);
  const documentZoom = useDocumentEditorStore((state) => state.zoom);
  const setDocumentZoom = useDocumentEditorStore((state) => state.setZoom);
  const documentZoomIn = useDocumentEditorStore((state) => state.zoomIn);
  const documentZoomOut = useDocumentEditorStore((state) => state.zoomOut);

  switch (mode) {
    case "markdown":
      return {
        zoom: markdownZoom,
        setZoom: setMarkdownZoom,
        zoomIn: markdownZoomIn,
        zoomOut: markdownZoomOut,
      };
    case "document":
      return {
        zoom: documentZoom,
        setZoom: setDocumentZoom,
        zoomIn: documentZoomIn,
        zoomOut: documentZoomOut,
      };
    case "preview":
      return {
        zoom: previewZoom,
        setZoom: setPreviewZoom,
        zoomIn: previewZoomIn,
        zoomOut: previewZoomOut,
      };
  }
}
