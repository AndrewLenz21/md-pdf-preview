import { useTranslations } from "next-intl";

import { Link } from "@/core/i18n";
import { Logo } from "@/shared/components/Logo";

export function NavbarLogo() {
  const t = useTranslations("Navigation");

  return (
    <Link
      href="/"
      className="group flex min-w-0 shrink-0 items-center gap-3"
      aria-label={t("brand.home")}
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-sm transition-transform group-hover:-translate-y-px"
      >
        <Logo className="h-9 w-9" />
      </span>
      <span className="hidden truncate text-sm font-semibold tracking-[-0.01em] text-foreground sm:inline sm:text-[0.9375rem]">
        {t("brand.name")}{" "}
        <span className="font-normal text-muted-foreground">
          {t("brand.descriptor")}
        </span>
      </span>
    </Link>
  );
}
