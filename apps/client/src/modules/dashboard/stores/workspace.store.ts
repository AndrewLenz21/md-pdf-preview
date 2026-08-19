import { create } from "zustand";

import type { PaperSize } from "@/modules/dashboard/types/paper.types";

import {
  readZoomPreferences,
  writeZoomPreferences,
} from "./zoomPersistence";

const MIN_ZOOM = 30;
const MAX_ZOOM = 150;
const ZOOM_INCREMENT = 10;
const DEFAULT_ZOOM = 100;
const MOBILE_DEFAULT_ZOOM = 50;

type WorkspaceState = {
  paperSize: PaperSize;
  markdownZoom: number;
  previewZoom: number;
  responsiveZoomInitialized: boolean;
  setPaperSize: (paperSize: PaperSize) => void;
  initializeViewportZoom: (isSmallScreen: boolean) => void;
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

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  paperSize: "a4",
  markdownZoom: DEFAULT_ZOOM,
  previewZoom: DEFAULT_ZOOM,
  responsiveZoomInitialized: false,
  setPaperSize: (paperSize) => set({ paperSize }),
  initializeViewportZoom: (isSmallScreen) => {
    if (get().responsiveZoomInitialized) {
      return;
    }

    const stored = readZoomPreferences();
    const markdownZoom = clampZoom(
      stored.markdownZoom ?? (isSmallScreen ? MOBILE_DEFAULT_ZOOM : DEFAULT_ZOOM),
    );
    const previewZoom = clampZoom(
      stored.previewZoom ?? (isSmallScreen ? MOBILE_DEFAULT_ZOOM : DEFAULT_ZOOM),
    );

    set({ markdownZoom, previewZoom, responsiveZoomInitialized: true });
    writeZoomPreferences({ markdownZoom, previewZoom });
  },
  setMarkdownZoom: (markdownZoom) => {
    const nextZoom = clampZoom(markdownZoom);

    set({ markdownZoom: nextZoom });
    writeZoomPreferences({ markdownZoom: nextZoom });
  },
  setPreviewZoom: (previewZoom) => {
    const nextZoom = clampZoom(previewZoom);

    set({ previewZoom: nextZoom });
    writeZoomPreferences({ previewZoom: nextZoom });
  },
  markdownZoomIn: () =>
    get().setMarkdownZoom(get().markdownZoom + ZOOM_INCREMENT),
  markdownZoomOut: () =>
    get().setMarkdownZoom(get().markdownZoom - ZOOM_INCREMENT),
  previewZoomIn: () =>
    get().setPreviewZoom(get().previewZoom + ZOOM_INCREMENT),
  previewZoomOut: () =>
    get().setPreviewZoom(get().previewZoom - ZOOM_INCREMENT),
  resetMarkdownZoom: () => get().setMarkdownZoom(DEFAULT_ZOOM),
  resetPreviewZoom: () => get().setPreviewZoom(DEFAULT_ZOOM),
}));

export const WORKSPACE_ZOOM = {
  min: MIN_ZOOM,
  max: MAX_ZOOM,
  increment: ZOOM_INCREMENT,
  default: DEFAULT_ZOOM,
  mobileDefault: MOBILE_DEFAULT_ZOOM,
} as const;
