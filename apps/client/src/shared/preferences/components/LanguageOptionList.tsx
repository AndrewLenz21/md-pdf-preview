"use client";

import { useTranslations } from "next-intl";

import type { Locale } from "@/core/i18n";

import { APP_LANGUAGES } from "../constants/languages";
import { FlagIcon } from "./FlagIcon";

/**
 * Renders the shared language choices in either compact menu or dialog form.
 * The selection callback remains owned by the caller so navigation behavior is
 * reusable without embedding menu or modal state here.
 */
export function LanguageOptionList({
  variant,
  locale,
  onSelect,
}: {
  variant: "menu" | "dialog";
  locale: Locale;
  onSelect: (locale: Locale) => void;
}) {
  const t = useTranslations("Navigation");

  if (variant === "menu") {
    return (
      <>
        {APP_LANGUAGES.map((language) => {
          const selected = language.code === locale;

          return (
            <button
              key={language.code}
              type="button"
              role="menuitemradio"
              aria-checked={selected}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${selected ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
              onClick={() => onSelect(language.code)}
            >
              <span className="flex items-center gap-2">
                <span className="flex h-4 w-6 items-center justify-center overflow-hidden rounded-[2px] ring-1 ring-border/30">
                  <FlagIcon country={language.code} />
                </span>
                <span>{t(`language.options.${language.key}`)}</span>
              </span>
              {selected ? <span aria-hidden="true">✓</span> : null}
            </button>
          );
        })}
      </>
    );
  }

  return (
    <div className="space-y-1">
      {APP_LANGUAGES.map((language) => {
        const active = language.code === locale;

        return (
          <button
            key={language.code}
            type="button"
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${active ? "bg-accent font-semibold text-accent-foreground" : "text-foreground hover:bg-accent/50"}`}
            onClick={() => onSelect(language.code)}
          >
            <span className="flex h-5 w-7 items-center justify-center overflow-hidden rounded-[2px] ring-1 ring-border/30">
              <FlagIcon country={language.code} />
            </span>
            <span className="flex-1 text-left">
              {t(`language.options.${language.key}`)}
            </span>
            <span className="text-xs text-muted-foreground">
              {language.shortCode}
            </span>
            <span className="flex h-5 w-5 items-center justify-center text-primary">
              {active ? "✓" : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
