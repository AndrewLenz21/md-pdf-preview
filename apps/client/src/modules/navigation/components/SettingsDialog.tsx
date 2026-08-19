"use client";

import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { type Locale } from "@/core/i18n";

import { NAVIGATION_LANGUAGES } from "../constants/navigation.constants";
import { isAppTheme, useThemeStore } from "../stores/themeStore";
import { FlagIcon } from "./FlagIcon";
import { GlobeIcon } from "./GlobeIcon";
import { ModalShell } from "./ModalShell";
import { ThemeModeIcon } from "./ThemeModeIcon";
import { ThemePreview } from "./ThemePreview";

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

export function SettingsDialog({
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
  const settingsTitle = t.has("settings.dialogTitle")
    ? t("settings.dialogTitle")
    : t("settings.label");
  const description = t.has("settings.description")
    ? t("settings.description")
    : "Customize your workspace.";
  const closeLabel = t.has("aria.closeDialog")
    ? t("aria.closeDialog")
    : "Close dialog";

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={settingsTitle}
      description={description}
      closeLabel={closeLabel}
    >
      <div className="space-y-1">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent/60"
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
          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent/60"
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
    </ModalShell>
  );
}
