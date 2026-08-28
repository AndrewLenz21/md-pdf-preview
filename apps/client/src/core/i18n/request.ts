import { getRequestConfig } from "next-intl/server";

import { getNavigationMessages } from "@/modules/navigation/i18n";
import { getAuthMessages } from "@/modules/auth/i18n";
import { getDashboardMessages } from "@/modules/dashboard/i18n";
import { getLandingMessages } from "@/modules/landing/i18n";
import { getLegalMessages } from "@/modules/legal/i18n";

import { locales, routing, type Locale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale: Locale = locales.includes(requestedLocale as Locale)
    ? (requestedLocale as Locale)
    : routing.defaultLocale;

  return {
    locale,
    messages: {
      Navigation: await getNavigationMessages(locale),
      Auth: await getAuthMessages(locale),
      Dashboard: await getDashboardMessages(locale),
      Landing: await getLandingMessages(locale),
      Legal: await getLegalMessages(locale),
    },
  };
});
