"use client";

import { useLocale } from "next-intl";

import { usePathname, useRouter, type Locale } from "@/core/i18n";
import { useLocaleStore } from "@/core/i18n/localeStore";

import { APP_LANGUAGES } from "../constants/languages";

/**
 * Centralizes locale lookup and navigation so menus, dialogs, and settings all
 * update the stored and routed locale in the same order.
 */
export function useLocaleSelection() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const setStoredLocale = useLocaleStore((state) => state.setLocale);
  const currentLanguage =
    APP_LANGUAGES.find((language) => language.code === locale) ??
    APP_LANGUAGES[0];

  const selectLocale = (nextLocale: Locale, onSelected?: () => void) => {
    setStoredLocale(nextLocale);
    onSelected?.();
    router.replace(pathname, { locale: nextLocale });
  };

  return { locale, currentLanguage, selectLocale };
}
