import type { Locale } from "@/core/i18n";

const navigationMessages = {
  en: () => import("./messages/en.json"),
  es: () => import("./messages/es.json"),
  it: () => import("./messages/it.json"),
};

export async function getNavigationMessages(locale: Locale) {
  return (await navigationMessages[locale]()).default;
}
