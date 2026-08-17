"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { startThemeTransition } from "@/core/theme";

import {
  APP_THEME_NAMES,
  isAppTheme,
  useThemeStore,
  type AppTheme,
} from "../stores/themeStore";
import { ModalShell } from "./ModalShell";
import { ThemePreview } from "./ThemePreview";

const subscribeToMount = () => () => {};
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

export function ThemeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const mounted = useSyncExternalStore(
    subscribeToMount,
    getClientMountSnapshot,
    getServerMountSnapshot,
  );
  const { theme: nextTheme, setTheme: setNextTheme } = useTheme();
  const storedTheme = useThemeStore((state) => state.theme);
  const setStoredTheme = useThemeStore((state) => state.setTheme);
  const t = useTranslations("Navigation");
  const currentTheme =
    mounted && isAppTheme(nextTheme) ? nextTheme : storedTheme;
  const dialogTitle = t.has("theme.dialogTitle")
    ? t("theme.dialogTitle")
    : t("theme.label");
  const description = t.has("theme.description") ? t("theme.description") : "";
  const closeLabel = t.has("aria.closeDialog")
    ? t("aria.closeDialog")
    : "Close dialog";

  const selectTheme = (theme: AppTheme) => {
    startThemeTransition();
    setNextTheme(theme);
    setStoredTheme(theme);
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={dialogTitle}
      description={description}
      closeLabel={closeLabel}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-1.5">
        {APP_THEME_NAMES.map((theme) => {
          const active = theme === currentTheme;

          return (
            <button
              key={theme}
              type="button"
              className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors sm:px-4 ${active ? "bg-accent ring-1 ring-primary/30" : "hover:bg-accent/50"}`}
              onClick={() => selectTheme(theme)}
            >
              <ThemePreview theme={theme} />
              <span className="min-w-0">
                <span
                  className={`block text-sm font-semibold ${active ? "text-accent-foreground" : "text-foreground"}`}
                >
                  {t(`theme.options.${theme}`)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t.has(`theme.descriptions.${theme}`)
                    ? t(`theme.descriptions.${theme}`)
                    : t(`theme.options.${theme}`)}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 items-center justify-center text-primary transition-[transform,opacity] duration-200 ${active ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
              >
                ✓
              </span>
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}
