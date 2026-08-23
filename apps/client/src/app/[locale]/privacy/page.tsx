import { locales } from "@/core/i18n";
import { LegalPage } from "@/modules/legal";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function PrivacyPage() {
  return <LegalPage document="privacy" />;
}
