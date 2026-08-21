"use client";

import { LanguageDialog } from "./LanguageDialog";
import { SettingsDialog } from "./SettingsDialog";
import { ThemeDialog } from "./ThemeDialog";

import type { PreferenceDialog } from "../types";

export type { PreferenceDialog } from "../types";

/**
 * Mounts the shared preference dialogs from one controlled active-dialog value.
 * Callers decide where the trigger lives while this host keeps nested dialog
 * transitions consistent across navigation and dashboard surfaces.
 */
export function PreferencesDialogHost({
  activeDialog,
  onChange,
}: {
  activeDialog: PreferenceDialog;
  onChange: (dialog: PreferenceDialog) => void;
}) {
  return (
    <>
      <SettingsDialog
        open={activeDialog === "settings"}
        onClose={() => onChange(null)}
        onOpenLanguage={() => onChange("language")}
        onOpenTheme={() => onChange("theme")}
      />
      <LanguageDialog
        open={activeDialog === "language"}
        onClose={() => onChange(null)}
      />
      <ThemeDialog
        open={activeDialog === "theme"}
        onClose={() => onChange(null)}
      />
    </>
  );
}
