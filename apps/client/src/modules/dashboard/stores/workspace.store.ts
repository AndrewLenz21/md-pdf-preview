import { create } from "zustand";

import type { PaperSize } from "@/modules/dashboard/types/paper.types";

const MIN_ZOOM = 30;
const MAX_ZOOM = 150;
const ZOOM_INCREMENT = 10;
const DEFAULT_ZOOM = 100;

type WorkspaceState = {
  paperSize: PaperSize;
  markdownZoom: number;
  previewZoom: number;
  setPaperSize: (paperSize: PaperSize) => void;
  setMarkdownZoom: (zoom: number) => void;
  setPreviewZoom: (zoom: number) => void;
  markdownZoomIn: () => void;
  markdownZoomOut: () => void;
  previewZoomIn: () => void;
  previewZoomOut: () => void;
  resetMarkdownZoom: () => void;
  resetPreviewZoom: () => void;
};

const clampZoom = (zoom: number) => {
  if (!Number.isFinite(zoom)) {
    return DEFAULT_ZOOM;
  }

  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  paperSize: "a4",
  markdownZoom: DEFAULT_ZOOM,
  previewZoom: DEFAULT_ZOOM,
  setPaperSize: (paperSize) => set({ paperSize }),
  setMarkdownZoom: (markdownZoom) =>
    set({ markdownZoom: clampZoom(markdownZoom) }),
  setPreviewZoom: (previewZoom) => set({ previewZoom: clampZoom(previewZoom) }),
  markdownZoomIn: () =>
    set((state) => ({
      markdownZoom: clampZoom(state.markdownZoom + ZOOM_INCREMENT),
    })),
  markdownZoomOut: () =>
    set((state) => ({
      markdownZoom: clampZoom(state.markdownZoom - ZOOM_INCREMENT),
    })),
  previewZoomIn: () =>
    set((state) => ({
      previewZoom: clampZoom(state.previewZoom + ZOOM_INCREMENT),
    })),
  previewZoomOut: () =>
    set((state) => ({
      previewZoom: clampZoom(state.previewZoom - ZOOM_INCREMENT),
    })),
  resetMarkdownZoom: () => set({ markdownZoom: DEFAULT_ZOOM }),
  resetPreviewZoom: () => set({ previewZoom: DEFAULT_ZOOM }),
}));

export const WORKSPACE_ZOOM = {
  min: MIN_ZOOM,
  max: MAX_ZOOM,
  increment: ZOOM_INCREMENT,
  default: DEFAULT_ZOOM,
} as const;
