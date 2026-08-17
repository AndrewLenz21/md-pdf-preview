"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { Link, type Locale } from "@/core/i18n";

import {
  NAVIGATION_LANGUAGES,
  NAVIGATION_LINKS,
} from "../constants/navigation.constants";
import { isAppTheme, useThemeStore } from "../stores/themeStore";
import { FlagIcon } from "./FlagIcon";
import { GlobeIcon } from "./GlobeIcon";
import { ThemePreview } from "./ThemePreview";
import { ThemeModeIcon } from "./ThemeModeIcon";
import { AuthActions } from "./AuthActions";

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MobileDrawer({
  open,
  onClose,
  onOpenLanguage,
  onOpenTheme,
}: {
  open: boolean;
  onClose: () => void;
  onOpenLanguage: () => void;
  onOpenTheme: () => void;
}) {
  const locale = useLocale() as Locale;
  const { theme: nextTheme, resolvedTheme } = useTheme();
  const storedTheme = useThemeStore((state) => state.theme);
  const t = useTranslations("Navigation");
  const currentTheme = isAppTheme(nextTheme) ? nextTheme : storedTheme;
  const isDarkTheme =
    currentTheme === "dark" ||
    currentTheme === "atom" ||
    (currentTheme === "system" && resolvedTheme === "dark");
  const currentLanguage =
    NAVIGATION_LANGUAGES.find((language) => language.code === locale) ??
    NAVIGATION_LANGUAGES[0];
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
  const preferencesSection = t.has("mobile.preferencesSection")
    ? t("mobile.preferencesSection")
    : "Preferences";

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

        <p className="mt-7 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {preferencesSection}
        </p>
        <div className="mt-2 flex flex-col gap-1">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent/60"
            onClick={onOpenLanguage}
          >
            <span className="flex items-center gap-3">
              <GlobeIcon />
              {t("language.label")}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="flex h-4 w-6 items-center justify-center overflow-hidden rounded-[2px] ring-1 ring-border/30">
                <FlagIcon country={currentLanguage.code as Locale} />
              </span>
              {t(`language.options.${currentLanguage.key}`)}
              <ChevronRightIcon />
            </span>
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent/60"
            onClick={onOpenTheme}
          >
            <span className="flex items-center gap-3">
              <ThemeModeIcon dark={isDarkTheme} />
              {t("theme.label")}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ThemePreview theme={currentTheme} compact />
              {t(`theme.options.${currentTheme}`)}
              <ChevronRightIcon />
            </span>
          </button>
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <AuthActions mobile onClose={onClose} />
      </div>
    </aside>
  );
}
