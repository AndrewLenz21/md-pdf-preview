import { locales } from "@/core/i18n";
import { LegalPage } from "@/modules/legal";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function TermsPage() {
  return <LegalPage document="terms" />;
}
