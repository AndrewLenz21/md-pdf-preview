"use client";

import { createPortal } from "react-dom";
import { Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { LanguageSelector } from "./LanguageSelector";
import { ThemeMenu } from "./ThemeMenu";

type PopoverPosition = {
  left: number;
  top: number;
};

export function SettingsMenu({
  placement = "bottom",
}: {
  placement?: "bottom" | "sidebar";
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const t = useTranslations("Navigation");
  const settingsLabel = t.has("settings.label")
    ? t("settings.label")
    : "Settings";
  const openSettingsLabel = t.has("settings.open")
    ? t("settings.open")
    : "Open settings";

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        !triggerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const trigger = triggerRef.current;
    const popover = popoverRef.current;

    if (!trigger || !popover) {
      return;
    }

    const viewportGap = 8;
    const updatePosition = () => {
      const triggerRect = trigger.getBoundingClientRect();
      const popoverWidth = popover.offsetWidth;
      const popoverHeight = popover.offsetHeight;
      const maxLeft = Math.max(
        viewportGap,
        window.innerWidth - popoverWidth - viewportGap,
      );
      const maxTop = Math.max(
        viewportGap,
        window.innerHeight - popoverHeight - viewportGap,
      );
      const preferredLeft =
        placement === "sidebar"
          ? triggerRect.left
          : triggerRect.right - popoverWidth;
      const preferredTop =
        placement === "sidebar"
          ? triggerRect.top - popoverHeight - viewportGap
          : triggerRect.bottom + viewportGap;
      const fallbackTop =
        placement === "sidebar"
          ? triggerRect.bottom + viewportGap
          : triggerRect.top - popoverHeight - viewportGap;
      const fitsViewport = (value: number, maximum: number) =>
        value >= viewportGap && value <= maximum;
      const nextTop = fitsViewport(preferredTop, maxTop)
        ? preferredTop
        : fitsViewport(fallbackTop, maxTop)
          ? fallbackTop
          : Math.min(Math.max(preferredTop, viewportGap), maxTop);

      setPosition({
        left: Math.min(Math.max(preferredLeft, viewportGap), maxLeft),
        top: nextTop,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updatePosition);
    resizeObserver?.observe(popover);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      resizeObserver?.disconnect();
    };
  }, [open, placement]);

  return (
    <div className="relative">
      <button
        type="button"
        ref={triggerRef}
        aria-label={openSettingsLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={() => {
          setPosition(null);
          setOpen((value) => !value);
        }}
      >
        <Settings2 className="h-4 w-4" strokeWidth={1.7} />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              role="menu"
              aria-label={settingsLabel}
              className="fixed z-[200] max-h-[calc(100dvh-1rem)] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-border bg-background p-2 shadow-xl"
              style={{
                left: position?.left ?? 0,
                top: position?.top ?? 0,
                visibility: position ? "visible" : "hidden",
              }}
            >
              <div className="border-b border-border/70 px-2.5 pb-2.5">
                <p className="text-sm font-semibold text-foreground">
                  {settingsLabel}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.has("settings.description")
                    ? t("settings.description")
                    : "Customize your workspace."}
                </p>
              </div>
              <div className="space-y-1 pt-2">
                <div className="rounded-lg px-1 py-0.5 hover:bg-accent/40">
                  <ThemeMenu showLabel inline />
                </div>
                <div className="rounded-lg px-1 py-0.5 hover:bg-accent/40">
                  <LanguageSelector showLabel inline />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
