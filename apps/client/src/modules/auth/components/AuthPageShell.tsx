import { Link } from "@/core/i18n";
import { useTranslations } from "next-intl";

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Auth.navigation");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--primary)_0,transparent_42%)] opacity-[0.09]" />
      <div className="relative w-full max-w-sm">
        <Link
          href="/"
          className="group mb-5 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground transition-transform group-hover:-translate-x-0.5"
          >
            M
          </span>
          <span>{t("backHome")}</span>
          <span aria-hidden="true" className="text-muted-foreground">
            ↗
          </span>
        </Link>
        {children}
      </div>
    </main>
  );
}
