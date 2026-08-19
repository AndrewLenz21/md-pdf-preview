"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/core/i18n";

import { NAVIGATION_LINKS } from "../constants/navigation.constants";
import { AuthActions } from "./AuthActions";

export function MobileDrawer({
  open,
  onClose,
  onOpenSettings,
}: {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  const t = useTranslations("Navigation");
  const closeMenuLabel = t.has("aria.closeMobileMenu")
    ? t("aria.closeMobileMenu")
    : "Close navigation menu";
  const primaryNavigationLabel = t.has("aria.primaryNavigation")
    ? t("aria.primaryNavigation")
    : "Primary navigation";
  const menuTitle = t.has("mobile.menuTitle") ? t("mobile.menuTitle") : "Menu";
  const navigationSection = t.has("mobile.navigationSection")
    ? t("mobile.navigationSection")
    : "Navigation";

  return (
    <aside
      id="mobile-navigation"
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-label={primaryNavigationLabel}
      inert={!open}
      data-state={open ? "open" : "closed"}
      className="navigation-drawer fixed inset-y-0 right-0 z-[100] flex w-full max-w-sm flex-col border-l border-border bg-background p-5 shadow-2xl sm:p-6"
    >
      <div className="flex items-center justify-between border-b border-border pb-4">
        <span className="text-sm font-semibold text-foreground">
          {menuTitle}
        </span>
        <button
          type="button"
          aria-label={closeMenuLabel}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          onClick={onClose}
        >
          <span className="sr-only">{closeMenuLabel}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              d="m6 6 12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-5">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {navigationSection}
        </p>
        <nav
          aria-label={primaryNavigationLabel}
          className="mt-2 flex flex-col gap-1"
        >
          {NAVIGATION_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/60"
              onClick={onClose}
            >
              {t(`links.${link.key}`)}
            </Link>
          ))}
        </nav>

      </div>

      <div className="border-t border-border pt-5">
        <AuthActions
          mobile
          onClose={onClose}
          onOpenSettings={onOpenSettings}
        />
      </div>
    </aside>
  );
}
