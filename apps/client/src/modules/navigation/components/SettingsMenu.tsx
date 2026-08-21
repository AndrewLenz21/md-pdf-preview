"use client";

import { createPortal } from "react-dom";
import {
  ChevronRight,
  House,
  Languages,
  LogOut,
  Palette,
  Settings2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { Link } from "@/core/i18n";
import { useDismissableLayer } from "@/shared/hooks/useDismissableLayer";
import {
  PreferencesDialogHost,
  usePreferencesDialog,
} from "@/shared/preferences";

type PopoverPosition = {
  left: number;
  top: number;
};

export function SettingsMenu({
  placement = "bottom",
  onSignOut,
  signOutLabel = "Sign out",
}: {
  placement?: "bottom" | "sidebar";
  onSignOut?: () => void | Promise<void>;
  signOutLabel?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeMenuTimerRef = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [menuRendered, setMenuRendered] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const { activeDialog, openDialog, closeDialog } = usePreferencesDialog();
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const t = useTranslations("Navigation");
  const settingsLabel = t.has("settings.label")
    ? t("settings.label")
    : "Settings";
  const openSettingsLabel = t.has("settings.open")
    ? t("settings.open")
    : "Open settings";
  const themeLabel = t.has("theme.label") ? t("theme.label") : "Theme";
  const languageLabel = t.has("language.label")
    ? t("language.label")
    : "Language";
  const landingLabel = t.has("links.landing")
    ? t("links.landing")
    : "Back to landing page";

  const clearCloseMenuTimer = useCallback(() => {
    if (closeMenuTimerRef.current !== undefined) {
      window.clearTimeout(closeMenuTimerRef.current);
      closeMenuTimerRef.current = undefined;
    }
  }, []);

  const requestCloseMenu = useCallback(() => {
    clearCloseMenuTimer();
    setOpen(false);
    setMenuClosing(true);
    closeMenuTimerRef.current = window.setTimeout(() => {
      setMenuRendered(false);
      setMenuClosing(false);
      closeMenuTimerRef.current = undefined;
    }, 260);
  }, [clearCloseMenuTimer]);

  const toggleMenu = () => {
    if (open) {
      requestCloseMenu();
      return;
    }

    clearCloseMenuTimer();
    setMenuClosing(false);
    setMenuRendered(true);
    setOpen(true);
  };

  useDismissableLayer({
    enabled: menuRendered && !activeDialog,
    refs: [triggerRef, popoverRef],
    onDismiss: requestCloseMenu,
  });

  useEffect(() => {
    return () => clearCloseMenuTimer();
  }, [clearCloseMenuTimer]);

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
          toggleMenu();
        }}
      >
        <Settings2 className="h-4 w-4" strokeWidth={1.7} />
      </button>

      {menuRendered && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              role="menu"
              aria-label={settingsLabel}
              className={`${menuClosing ? "settings-menu-popover-exit" : "settings-menu-popover-enter"} fixed z-[200] max-h-[calc(100dvh-1rem)] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-border p-2 shadow-xl ${placement === "sidebar" ? "bg-sidebar-accent" : "bg-background"}`}
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
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup="dialog"
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => openDialog("theme")}
                >
                  <Palette
                    className="h-4 w-4 text-muted-foreground"
                    strokeWidth={1.7}
                  />
                  <span className="min-w-0 flex-1">{themeLabel}</span>
                  <ChevronRight
                    className="h-3.5 w-3.5 text-muted-foreground"
                    strokeWidth={1.7}
                  />
                </button>
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup="dialog"
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => openDialog("language")}
                >
                  <Languages
                    className="h-4 w-4 text-muted-foreground"
                    strokeWidth={1.7}
                  />
                  <span className="min-w-0 flex-1">{languageLabel}</span>
                  <ChevronRight
                    className="h-3.5 w-3.5 text-muted-foreground"
                    strokeWidth={1.7}
                  />
                </button>
                {placement === "sidebar" ? (
                  <Link
                    href="/"
                    role="menuitem"
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={requestCloseMenu}
                  >
                    <House
                      className="h-4 w-4 text-muted-foreground"
                      strokeWidth={1.7}
                    />
                    <span className="min-w-0 flex-1">{landingLabel}</span>
                  </Link>
                ) : null}
              </div>
              {onSignOut ? (
                <>
                  <div className="my-2 border-t border-border/70" />
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      requestCloseMenu();
                      void onSignOut();
                    }}
                  >
                    <LogOut className="h-3.5 w-3.5" strokeWidth={1.7} />
                    {signOutLabel}
                  </button>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
      <PreferencesDialogHost
        activeDialog={activeDialog}
        onChange={(dialog) => (dialog ? openDialog(dialog) : closeDialog())}
      />
    </div>
  );
}
