"use client";

import { useTranslations } from "next-intl";

import { ModalShell } from "@/shared/components/ModalShell";

import { useLocaleSelection } from "../hooks/useLocaleSelection";
import { LanguageOptionList } from "./LanguageOptionList";

/**
 * Presents the shared full-size language picker used by navigation and the
 * dashboard preferences host.
 */

export function LanguageDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale, selectLocale } = useLocaleSelection();
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

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={dialogTitle}
      description={description}
      closeLabel={closeLabel}
    >
      <LanguageOptionList
        variant="dialog"
        locale={locale}
        onSelect={(newLocale) => selectLocale(newLocale, onClose)}
      />
    </ModalShell>
  );
}
