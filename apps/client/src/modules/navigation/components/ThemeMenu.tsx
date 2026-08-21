"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { useDismissableLayer } from "@/shared/hooks/useDismissableLayer";
import { ThemeModeIcon } from "@/shared/preferences/components/ThemeModeIcon";
import { ThemeOptionList, useAppTheme } from "@/shared/preferences";

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

export function ThemeMenu({
  showLabel = false,
  inline = false,
}: {
  showLabel?: boolean;
  inline?: boolean;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { currentTheme, isDarkTheme, selectTheme } = useAppTheme();
  const t = useTranslations("Navigation");

  useDismissableLayer({
    enabled: open,
    refs: [menuRef],
    onDismiss: () => setOpen(false),
  });

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
          className={`${inline ? "relative mt-1 w-full" : "absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64"} rounded-lg border border-border bg-card p-1.5 shadow-lg`}
        >
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("theme.label")}
          </p>
          <ThemeOptionList
            variant="menu"
            currentTheme={currentTheme}
            onSelect={selectTheme}
          />
        </div>
      ) : null}
    </div>
  );
}
