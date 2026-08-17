import { create } from "zustand";

import { WORKSPACE_ZOOM } from "./workspace.store";

type DocumentEditorState = {
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
};

const clampZoom = (zoom: number) => {
  if (!Number.isFinite(zoom)) {
    return WORKSPACE_ZOOM.default;
  }

  return Math.min(
    WORKSPACE_ZOOM.max,
    Math.max(WORKSPACE_ZOOM.min, zoom),
  );
};

export const useDocumentEditorStore = create<DocumentEditorState>((set) => ({
  zoom: WORKSPACE_ZOOM.default,
  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),
  zoomIn: () =>
    set((state) => ({
      zoom: clampZoom(state.zoom + WORKSPACE_ZOOM.increment),
    })),
  zoomOut: () =>
    set((state) => ({
      zoom: clampZoom(state.zoom - WORKSPACE_ZOOM.increment),
    })),
  resetZoom: () => set({ zoom: WORKSPACE_ZOOM.default }),
}));
