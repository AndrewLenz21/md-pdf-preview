import type { Locale } from "@/core/i18n";

const authMessages = {
  en: () => import("./messages/en.json"),
  es: () => import("./messages/es.json"),
  it: () => import("./messages/it.json"),
};

export async function getAuthMessages(locale: Locale) {
  return (await authMessages[locale]()).default;
}
