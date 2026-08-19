"use client";

import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

import { LanguageDialog } from "./LanguageDialog";
import { MobileDrawer } from "./MobileDrawer";
import { SettingsDialog } from "./SettingsDialog";
import { ThemeDialog } from "./ThemeDialog";

const subscribeToMount = () => () => {};
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

function MenuIcon({ close }: { close: boolean }) {
  return close ? (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MobileNavigation() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modal, setModal] = useState<
    "language" | "settings" | "theme" | null
  >(null);
  const mounted = useSyncExternalStore(
    subscribeToMount,
    getClientMountSnapshot,
    getServerMountSnapshot,
  );
  const t = useTranslations("Navigation");
  const openMenuLabel = t.has("aria.mobileMenu")
    ? t("aria.mobileMenu")
    : "Open navigation menu";
  const closeMenuLabel = t.has("aria.closeMobileMenu")
    ? t("aria.closeMobileMenu")
    : "Close navigation menu";

  useEffect(() => {
    if (!drawerOpen && !modal) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (modal) {
        setModal(null);
      } else {
        setDrawerOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [drawerOpen, modal]);

  const closeDrawer = () => {
    setModal(null);
    setDrawerOpen(false);
  };

  const openSettings = () => {
    setModal("settings");
  };

  const overlay = (
    <button
      type="button"
      aria-label={closeMenuLabel}
      aria-hidden={!drawerOpen}
      disabled={!drawerOpen}
      tabIndex={drawerOpen ? 0 : -1}
      data-state={drawerOpen ? "open" : "closed"}
      className="navigation-overlay fixed inset-0 z-[90] bg-foreground/30"
      onClick={closeDrawer}
    />
  );

  return (
    <>
      <button
        type="button"
        aria-label={drawerOpen ? closeMenuLabel : openMenuLabel}
        aria-expanded={drawerOpen}
        aria-controls="mobile-navigation"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground lg:hidden"
        onClick={() => (drawerOpen ? closeDrawer() : setDrawerOpen(true))}
      >
        <MenuIcon close={drawerOpen} />
      </button>

      {mounted
        ? createPortal(
            <>
              {overlay}
              <MobileDrawer
                open={drawerOpen}
                onClose={closeDrawer}
                onOpenSettings={openSettings}
              />
              <SettingsDialog
                open={modal === "settings"}
                onClose={() => setModal(null)}
                onOpenLanguage={() => setModal("language")}
                onOpenTheme={() => setModal("theme")}
              />
              <LanguageDialog
                open={modal === "language"}
                onClose={() => setModal(null)}
              />
              <ThemeDialog
                open={modal === "theme"}
                onClose={() => setModal(null)}
              />
            </>,
            document.body,
          )
        : null}
    </>
  );
}
