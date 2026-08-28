import { create } from "zustand";

/**
 * Stores the application theme independently from next-themes so shared
 * preference surfaces can read the same validated theme state.
 */
export const APP_THEME_NAMES = [
  "light",
  "dark",
  "atom",
  "sky",
  "ocean",
  "pink",
  "pressroom",
  "system",
] as const;

export type AppTheme = (typeof APP_THEME_NAMES)[number];

interface ThemeStore {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

export const useThemeStore = create<ThemeStore>()((set) => ({
  theme: "light",
  setTheme: (theme) => set({ theme }),
}));

export function isAppTheme(value: string | undefined): value is AppTheme {
  return Boolean(value && APP_THEME_NAMES.includes(value as AppTheme));
}
