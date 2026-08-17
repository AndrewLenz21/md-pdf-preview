"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter, type Locale } from "@/core/i18n";
import { useLocaleStore } from "@/core/i18n/localeStore";

import { NAVIGATION_LANGUAGES } from "../constants/navigation.constants";
import { FlagIcon } from "./FlagIcon";
import { GlobeIcon } from "./GlobeIcon";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="m5 12.5 4.25 4.25L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="m6.5 9 5.5 5.5L17.5 9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LanguageSelector({
  showLabel = false,
}: {
  showLabel?: boolean;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const setStoredLocale = useLocaleStore((state) => state.setLocale);
  const t = useTranslations("Navigation");
  const currentLanguage =
    NAVIGATION_LANGUAGES.find((language) => language.code === locale) ??
    NAVIGATION_LANGUAGES[0];

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const handleLanguageChange = (newLocale: Locale) => {
    setOpen(false);
    setStoredLocale(newLocale);
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent/60 hover:text-foreground"
        aria-label={t("language.select")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <GlobeIcon />
        <span className="flex h-4 w-6 items-center justify-center overflow-hidden rounded-[2px] ring-1 ring-border/30">
          <FlagIcon country={currentLanguage.code as Locale} />
        </span>
        <span
          className={
            showLabel
              ? "text-xs font-medium"
              : "hidden text-xs font-medium lg:inline"
          }
        >
          {t(`language.options.${currentLanguage.key}`)}
        </span>
        <ChevronDownIcon />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={t("language.select")}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-44 rounded-lg border border-border bg-card p-1.5 shadow-lg"
        >
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("language.label")}
          </p>
          {NAVIGATION_LANGUAGES.map((language) => {
            const isSelected = language.code === locale;

            return (
              <button
                key={language.code}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-accent font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
                onClick={() => handleLanguageChange(language.code)}
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-4 w-6 items-center justify-center overflow-hidden rounded-[2px] ring-1 ring-border/30">
                    <FlagIcon country={language.code as Locale} />
                  </span>
                  <span>{t(`language.options.${language.key}`)}</span>
                </span>
                {isSelected ? <CheckIcon /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
