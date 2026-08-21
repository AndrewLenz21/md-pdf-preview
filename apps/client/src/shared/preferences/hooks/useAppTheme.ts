"use client";

import { useTheme } from "next-themes";

import {
  isAppTheme,
  startThemeTransition,
  useThemeStore,
  type AppTheme,
} from "@/core/theme";
import { useIsMounted } from "@/shared/hooks/useIsMounted";

/**
 * Exposes the resolved application theme and its shared selection action for
 * every preference surface without coupling shared code to navigation.
 */
export function useAppTheme() {
  const mounted = useIsMounted();
  const {
    theme: nextTheme,
    resolvedTheme,
    setTheme: setNextTheme,
  } = useTheme();
  const storedTheme = useThemeStore((state) => state.theme);
  const setStoredTheme = useThemeStore((state) => state.setTheme);
  const currentTheme: AppTheme =
    mounted && isAppTheme(nextTheme) ? nextTheme : storedTheme;
  const isDarkTheme =
    currentTheme === "dark" ||
    currentTheme === "atom" ||
    (currentTheme === "system" && resolvedTheme === "dark");

  const selectTheme = (theme: AppTheme) => {
    startThemeTransition();
    setNextTheme(theme);
    setStoredTheme(theme);
  };

  return { currentTheme, isDarkTheme, selectTheme };
}
