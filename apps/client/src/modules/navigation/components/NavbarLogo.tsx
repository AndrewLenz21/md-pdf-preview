import { useTranslations } from "next-intl";

import { Link } from "@/core/i18n";

export function NavbarLogo() {
  const t = useTranslations("Navigation");

  return (
    <Link
      href="/"
      className="group flex min-w-0 shrink-0 items-center gap-2.5"
      aria-label={t("brand.home")}
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors group-hover:border-foreground/20 group-hover:text-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7.5 3.75h6.25L18.5 8.5v11.75h-11V3.75Z" />
          <path d="M13.75 3.75V8.5h4.75" />
          <path d="M10.25 12h5.5M10.25 15.25h3.75" />
        </svg>
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
