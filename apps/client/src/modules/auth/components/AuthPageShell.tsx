import { ArrowLeft } from "lucide-react";
import { Link } from "@/core/i18n";
import { Logo } from "@/shared/components/Logo";
import { useTranslations } from "next-intl";

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Auth.navigation");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--primary)_0,transparent_42%)] opacity-[0.09]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-4 flex justify-center">
          <Link
            href="/"
            aria-label={t("backHome")}
            className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span
              aria-hidden="true"
              className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-transform group-hover:-translate-y-1"
            >
              <Logo className="h-11 w-11" />
            </span>
          </Link>
        </div>
        <Link
          href="/"
          className="group mb-5 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-primary-foreground transition-transform group-hover:-translate-x-0.5"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={2} />
          </span>
          <span>{t("backHome")}</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
