import { Navbar } from "@/modules/navigation";
import { LandingPage } from "@/modules/landing";
import { locales } from "@/core/i18n";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <LandingPage />
    </div>
  );
}
