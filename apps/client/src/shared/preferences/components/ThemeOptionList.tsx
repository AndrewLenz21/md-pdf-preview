"use client";

import { useTranslations } from "next-intl";

import { APP_THEME_NAMES, type AppTheme } from "@/core/theme";

import { ThemePreview } from "./ThemePreview";

/**
 * Renders the shared theme choices in the compact menu or full dialog layout.
 * Theme state and selection are supplied by the caller through a small API.
 */
export function ThemeOptionList({
  variant,
  currentTheme,
  onSelect,
}: {
  variant: "menu" | "dialog";
  currentTheme: AppTheme;
  onSelect: (theme: AppTheme) => void;
}) {
  const t = useTranslations("Navigation");

  if (variant === "menu") {
    return (
      <>
        {APP_THEME_NAMES.map((theme) => {
          const selected = theme === currentTheme;

          return (
            <button
              key={theme}
              type="button"
              role="menuitemradio"
              aria-checked={selected}
              className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${selected ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
              onClick={() => onSelect(theme)}
            >
              <ThemePreview theme={theme} />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-foreground">
                  {t(`theme.options.${theme}`)}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {t.has(`theme.descriptions.${theme}`)
                    ? t(`theme.descriptions.${theme}`)
                    : t(`theme.options.${theme}`)}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 items-center justify-center text-primary transition-[transform,opacity] duration-200 ${selected ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
              >
                ✓
              </span>
            </button>
          );
        })}
      </>
    );
  }

  return (
    <div className="space-y-1.5">
      {APP_THEME_NAMES.map((theme) => {
        const active = theme === currentTheme;

        return (
          <button
            key={theme}
            type="button"
            className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors sm:px-4 ${active ? "bg-accent ring-1 ring-primary/30" : "hover:bg-accent/50"}`}
            onClick={() => onSelect(theme)}
          >
            <ThemePreview theme={theme} />
            <span className="min-w-0">
              <span
                className={`block text-sm font-semibold ${active ? "text-accent-foreground" : "text-foreground"}`}
              >
                {t(`theme.options.${theme}`)}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t.has(`theme.descriptions.${theme}`)
                  ? t(`theme.descriptions.${theme}`)
                  : t(`theme.options.${theme}`)}
              </span>
            </span>
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 items-center justify-center text-primary transition-[transform,opacity] duration-200 ${active ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
            >
              ✓
            </span>
          </button>
        );
      })}
    </div>
  );
}
