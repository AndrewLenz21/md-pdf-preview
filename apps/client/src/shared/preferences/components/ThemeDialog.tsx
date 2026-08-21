"use client";

import { useTranslations } from "next-intl";

import { ModalShell } from "@/shared/components/ModalShell";

import { useAppTheme } from "../hooks/useAppTheme";
import { ThemeOptionList } from "./ThemeOptionList";

/**
 * Presents the shared full-size theme picker used by every preferences host.
 */
export function ThemeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { currentTheme, selectTheme } = useAppTheme();
  const t = useTranslations("Navigation");
  const dialogTitle = t.has("theme.dialogTitle")
    ? t("theme.dialogTitle")
    : t("theme.label");
  const description = t.has("theme.description") ? t("theme.description") : "";
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
      maxWidth="max-w-2xl"
    >
      <ThemeOptionList
        variant="dialog"
        currentTheme={currentTheme}
        onSelect={selectTheme}
      />
    </ModalShell>
  );
}
