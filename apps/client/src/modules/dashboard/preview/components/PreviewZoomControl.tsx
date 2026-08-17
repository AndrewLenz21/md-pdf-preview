"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { WORKSPACE_ZOOM } from "@/modules/dashboard/stores";
import type { DocumentEditorMode } from "@/modules/dashboard/types/editor.types";

import { useModeZoom } from "../hooks/useModeZoom";
import { PreviewZoomSlider } from "./PreviewZoomSlider";

function ZoomPercentageInput({ mode }: { mode: DocumentEditorMode }) {
  const { zoom, setZoom } = useModeZoom(mode);
  const [draftZoom, setDraftZoom] = useState(String(zoom));

  const commitZoom = () => {
    const nextZoom = Number.parseInt(draftZoom, 10);

    if (Number.isFinite(nextZoom)) {
      setZoom(nextZoom);
      return;
    }

    setDraftZoom(String(zoom));
  };

  return (
    <label className="flex h-10 items-center rounded-md border border-border/80 bg-card/80 px-2 transition-[border-color,background-color,outline-color] duration-200 ease-out hover:border-primary/35 hover:bg-card focus-within:border-primary/70 focus-within:bg-background focus-within:outline focus-within:outline-1 focus-within:outline-primary/30 focus-within:outline-offset-1 focus-within:shadow-none">
      <input
        type="number"
        min={WORKSPACE_ZOOM.min}
        max={WORKSPACE_ZOOM.max}
        step={1}
        value={draftZoom}
        onChange={(event) => setDraftZoom(event.currentTarget.value)}
        onBlur={commitZoom}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitZoom();
            event.currentTarget.blur();
          }

          if (event.key === "Escape") {
            setDraftZoom(String(zoom));
            event.currentTarget.blur();
          }
        }}
        aria-label="Custom zoom percentage"
        className="w-12 bg-transparent text-center text-sm font-semibold tabular-nums text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-sm font-semibold text-muted-foreground">%</span>
    </label>
  );
}

function ZoomStepButton({
  direction,
  onClick,
  disabled,
}: {
  direction: "in" | "out";
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = direction === "in" ? Plus : Minus;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "in" ? "Zoom in" : "Zoom out"}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} />
    </button>
  );
}

export function PreviewZoomControl({
  mode,
  isMobile = false,
}: {
  mode: DocumentEditorMode;
  isMobile?: boolean;
}) {
  const { zoom, zoomIn, zoomOut } = useModeZoom(mode);
  const positioningClass = getPositioningClass(isMobile);

  return (
    <div
      data-document-control
      className={`${positioningClass} left-1/2 z-20 w-[min(calc(100%-2rem),24rem)] -translate-x-1/2 rounded-lg border border-border/80 bg-background/95 p-2 shadow-md backdrop-blur-sm lg:left-auto lg:right-6 lg:w-auto lg:translate-x-0 lg:p-1`}
    >
      <div className="hidden items-center gap-1 lg:flex">
        <ZoomStepButton
          direction="out"
          onClick={zoomOut}
          disabled={zoom <= WORKSPACE_ZOOM.min}
        />
        <ZoomPercentageInput key={zoom} mode={mode} />
        <ZoomStepButton
          direction="in"
          onClick={zoomIn}
          disabled={zoom >= WORKSPACE_ZOOM.max}
        />
      </div>

      <div className="flex flex-col gap-2 lg:hidden">
        <div className="flex items-center justify-between gap-3 px-1 text-xs font-medium text-muted-foreground">
          <span>Zoom</span>
          <span className="tabular-nums text-foreground">{zoom}%</span>
        </div>
        <PreviewZoomSlider mode={mode} />
        <div className="flex items-center justify-center gap-1">
          <ZoomStepButton
            direction="out"
            onClick={zoomOut}
            disabled={zoom <= WORKSPACE_ZOOM.min}
          />
          <ZoomPercentageInput key={zoom} mode={mode} />
          <ZoomStepButton
            direction="in"
            onClick={zoomIn}
            disabled={zoom >= WORKSPACE_ZOOM.max}
          />
        </div>
      </div>
    </div>
  );
}

function getPositioningClass(isMobile: boolean) {
  if (isMobile) {
    return "fixed mobile-zoom-control";
  }

  return "fixed desktop-zoom-control";
}
