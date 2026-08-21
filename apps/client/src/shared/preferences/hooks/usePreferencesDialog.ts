"use client";

import { useCallback, useState } from "react";

import type { PreferenceDialog } from "../types";

/**
 * Owns the active preference dialog so navigation and dashboard surfaces use
 * the same controlled language/settings/theme flow.
 */
export function usePreferencesDialog() {
  const [activeDialog, setActiveDialog] = useState<PreferenceDialog>(null);
  const closeDialog = useCallback(() => setActiveDialog(null), []);

  return {
    activeDialog,
    openDialog: setActiveDialog,
    closeDialog,
  };
}
