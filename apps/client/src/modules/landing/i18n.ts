import type { Locale } from "@/core/i18n";

const landingMessages = {
  en: () => import("./messages/en.json"),
  es: () => import("./messages/es.json"),
  it: () => import("./messages/it.json"),
};

export async function getLandingMessages(locale: Locale) {
  return (await landingMessages[locale]()).default;
}
