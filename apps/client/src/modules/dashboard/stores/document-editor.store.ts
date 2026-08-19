import { create } from "zustand";

import { WORKSPACE_ZOOM } from "./workspace.store";
import {
  readZoomPreferences,
  writeZoomPreferences,
} from "./zoomPersistence";

type DocumentEditorState = {
  zoom: number;
  responsiveZoomInitialized: boolean;
  initializeViewportZoom: (isSmallScreen: boolean) => void;
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

export const useDocumentEditorStore = create<DocumentEditorState>((set, get) => ({
  zoom: WORKSPACE_ZOOM.default,
  responsiveZoomInitialized: false,
  initializeViewportZoom: (isSmallScreen) => {
    if (get().responsiveZoomInitialized) {
      return;
    }

    const stored = readZoomPreferences();
    const zoom = clampZoom(
      stored.documentZoom ??
        (isSmallScreen ? WORKSPACE_ZOOM.mobileDefault : WORKSPACE_ZOOM.default),
    );

    set({ zoom, responsiveZoomInitialized: true });
    writeZoomPreferences({ documentZoom: zoom });
  },
  setZoom: (zoom) => {
    const nextZoom = clampZoom(zoom);

    set({ zoom: nextZoom });
    writeZoomPreferences({ documentZoom: nextZoom });
  },
  zoomIn: () =>
    get().setZoom(get().zoom + WORKSPACE_ZOOM.increment),
  zoomOut: () =>
    get().setZoom(get().zoom - WORKSPACE_ZOOM.increment),
  resetZoom: () => get().setZoom(WORKSPACE_ZOOM.default),
}));
