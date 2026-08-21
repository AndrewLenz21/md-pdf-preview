import type { Locale } from "@/core/i18n";

/**
 * Defines the language metadata consumed by every language preference surface.
 * Keeping this list outside navigation prevents dialogs and menus from
 * depending on a module-specific constants file.
 */
export const APP_LANGUAGES = [
  { code: "en", key: "english", shortCode: "EN" },
  { code: "es", key: "spanish", shortCode: "ES" },
  { code: "it", key: "italian", shortCode: "IT" },
] as const satisfies readonly {
  code: Locale;
  key: string;
  shortCode: string;
}[];
