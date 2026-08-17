import { useTranslations } from "next-intl";

import { Link } from "@/core/i18n";

import { NAVIGATION_LINKS } from "../constants/navigation.constants";

export function NavbarLinks() {
  const t = useTranslations("Navigation");

  return (
    <nav
      aria-label={t("aria.primaryNavigation")}
      className="hidden items-center gap-1 lg:flex"
    >
      {NAVIGATION_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
        >
          {t(`links.${link.key}`)}
        </Link>
      ))}
    </nav>
  );
}
