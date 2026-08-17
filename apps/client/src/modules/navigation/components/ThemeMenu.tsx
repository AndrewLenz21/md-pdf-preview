"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { startThemeTransition } from "@/core/theme";

import {
  APP_THEME_NAMES,
  isAppTheme,
  useThemeStore,
} from "../stores/themeStore";
import { ThemePreview } from "./ThemePreview";
import { ThemeModeIcon } from "./ThemeModeIcon";

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="m6.5 9 5.5 5.5L17.5 9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const subscribeToMount = () => () => {};
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

export function ThemeMenu({ showLabel = false }: { showLabel?: boolean }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeToMount,
    getClientMountSnapshot,
    getServerMountSnapshot,
  );
  const {
    theme: nextTheme,
    resolvedTheme,
    setTheme: setNextTheme,
  } = useTheme();
  const storedTheme = useThemeStore((state) => state.theme);
  const setStoredTheme = useThemeStore((state) => state.setTheme);
  const t = useTranslations("Navigation");

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const currentTheme =
    mounted && isAppTheme(nextTheme) ? nextTheme : storedTheme;
  const isDarkTheme =
    currentTheme === "dark" ||
    currentTheme === "atom" ||
    (currentTheme === "system" && resolvedTheme === "dark");

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
        aria-label={t("theme.select")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <ThemeModeIcon dark={isDarkTheme} />
        <span
          className={
            showLabel
              ? "text-xs font-medium"
              : "hidden text-xs font-medium lg:inline"
          }
        >
          {t(`theme.options.${currentTheme}`)}
        </span>
        <ChevronDownIcon />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={t("theme.select")}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-lg border border-border bg-card p-1.5 shadow-lg"
        >
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("theme.label")}
          </p>
          {APP_THEME_NAMES.map((theme) => {
            const isSelected = theme === currentTheme;

            return (
              <button
                key={theme}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                  isSelected
                    ? "bg-accent font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
                onClick={() => {
                  startThemeTransition();
                  setNextTheme(theme);
                  setStoredTheme(theme);
                }}
              >
                <ThemePreview theme={theme} />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-foreground">
                    {t(`theme.options.${theme}`)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {t.has(`theme.descriptions.${theme}`)
                      ? t(`theme.descriptions.${theme}`)
                      : t(`theme.options.${theme}`)}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 items-center justify-center text-primary transition-[transform,opacity] duration-200 ${isSelected ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
