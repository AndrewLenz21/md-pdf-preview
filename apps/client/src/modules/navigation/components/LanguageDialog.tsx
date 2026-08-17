"use client";

import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";

import { usePathname, useRouter, type Locale } from "@/core/i18n";
import { useLocaleStore } from "@/core/i18n/localeStore";

import { NAVIGATION_LANGUAGES } from "../constants/navigation.constants";
import { FlagIcon } from "./FlagIcon";
import { ModalShell } from "./ModalShell";

export function LanguageDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const setStoredLocale = useLocaleStore((state) => state.setLocale);
  const t = useTranslations("Navigation");
  const dialogTitle = t.has("language.dialogTitle")
    ? t("language.dialogTitle")
    : t("language.label");
  const description = t.has("language.description")
    ? t("language.description")
    : "";
  const closeLabel = t.has("aria.closeDialog")
    ? t("aria.closeDialog")
    : "Close dialog";

  const selectLanguage = (newLocale: Locale) => {
    setStoredLocale(newLocale);
    onClose();
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={dialogTitle}
      description={description}
      closeLabel={closeLabel}
    >
      <div className="space-y-1">
        {NAVIGATION_LANGUAGES.map((language) => {
          const active = language.code === locale;

          return (
            <button
              key={language.code}
              type="button"
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${active ? "bg-accent font-semibold text-accent-foreground" : "text-foreground hover:bg-accent/50"}`}
              onClick={() => selectLanguage(language.code as Locale)}
            >
              <span className="flex h-5 w-7 items-center justify-center overflow-hidden rounded-[2px] ring-1 ring-border/30">
                <FlagIcon country={language.code as Locale} />
              </span>
              <span className="flex-1 text-left">
                {t(`language.options.${language.key}`)}
              </span>
              <span className="text-xs text-muted-foreground">
                {language.shortCode}
              </span>
              <span className="flex h-5 w-5 items-center justify-center text-primary">
                {active ? "✓" : null}
              </span>
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}
