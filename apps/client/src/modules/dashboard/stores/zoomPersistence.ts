export const ZOOM_PREFERENCES_STORAGE_KEY = "md-pdf-preview:zoom-preferences";

export type ZoomPreferences = {
  markdownZoom?: number;
  previewZoom?: number;
  documentZoom?: number;
};

export function readZoomPreferences(): ZoomPreferences {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(ZOOM_PREFERENCES_STORAGE_KEY);

    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored) as ZoomPreferences;

    return {
      markdownZoom: Number.isFinite(parsed.markdownZoom)
        ? parsed.markdownZoom
        : undefined,
      previewZoom: Number.isFinite(parsed.previewZoom)
        ? parsed.previewZoom
        : undefined,
      documentZoom: Number.isFinite(parsed.documentZoom)
        ? parsed.documentZoom
        : undefined,
    };
  } catch {
    return {};
  }
}

export function writeZoomPreferences(update: ZoomPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      ZOOM_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ ...readZoomPreferences(), ...update }),
    );
  } catch {
    // Zoom state remains available in Zustand when storage is unavailable.
  }
}
