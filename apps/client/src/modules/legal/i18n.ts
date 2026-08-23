import type { Locale } from "@/core/i18n";

const legalMessages = {
  en: () => import("./messages/en.json"),
  es: () => import("./messages/es.json"),
  it: () => import("./messages/it.json"),
};

export async function getLegalMessages(locale: Locale) {
  return (await legalMessages[locale]()).default;
}
