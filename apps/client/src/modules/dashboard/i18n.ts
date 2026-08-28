import type { Locale } from "@/core/i18n";

const dashboardMessages = {
  en: () => import("./messages/en.json"),
  es: () => import("./messages/es.json"),
  it: () => import("./messages/it.json"),
};

export async function getDashboardMessages(locale: Locale) {
  return (await dashboardMessages[locale]()).default;
}
