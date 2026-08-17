"use client";

import { WORKSPACE_ZOOM } from "@/modules/dashboard/stores";
import type { DocumentEditorMode } from "@/modules/dashboard/types/editor.types";

import { useModeZoom } from "../hooks/useModeZoom";

export function PreviewZoomSlider({
  mode,
  className = "",
}: {
  mode: DocumentEditorMode;
  className?: string;
}) {
  const { zoom, setZoom } = useModeZoom(mode);
  const progress =
    ((zoom - WORKSPACE_ZOOM.min) /
      (WORKSPACE_ZOOM.max - WORKSPACE_ZOOM.min)) *
    100;

  return (
    <input
      type="range"
      min={WORKSPACE_ZOOM.min}
      max={WORKSPACE_ZOOM.max}
      step={1}
      value={zoom}
      onChange={(event) => setZoom(event.currentTarget.valueAsNumber)}
      aria-label="Zoom percentage"
      aria-valuetext={`${zoom}%`}
      className={`h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
      style={{
        background: `linear-gradient(to right, var(--primary) ${progress}%, var(--muted) ${progress}%)`,
        accentColor: "var(--primary)",
      }}
    />
  );
}
