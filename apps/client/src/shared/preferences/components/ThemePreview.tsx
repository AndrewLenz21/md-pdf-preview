import type { AppTheme } from "@/core/theme";

type ThemeColors = {
  background: string;
  surface: string;
  primary: string;
  text: string;
  border: string;
};

const THEME_META: Record<AppTheme, ThemeColors> = {
  light: {
    background: "oklch(1 0 0)",
    surface: "oklch(0.97 0 0)",
    primary: "oklch(0.205 0 0)",
    text: "oklch(0.145 0 0)",
    border: "oklch(0.922 0 0)",
  },
  dark: {
    background: "oklch(0.145 0 0)",
    surface: "oklch(0.205 0 0)",
    primary: "oklch(0.922 0 0)",
    text: "oklch(0.985 0 0)",
    border: "oklch(1 0 0 / 18%)",
  },
  atom: {
    background: "oklch(0.27 0.03 260)",
    surface: "oklch(0.24 0.03 260)",
    primary: "oklch(0.73 0.17 245)",
    text: "oklch(0.79 0.03 260)",
    border: "oklch(1 0 0 / 18%)",
  },
  sky: {
    background: "oklch(0.96 0.015 235)",
    surface: "oklch(1 0 0)",
    primary: "oklch(0.45 0.14 255)",
    text: "oklch(0.25 0.06 250)",
    border: "oklch(0.84 0.05 235)",
  },
  ocean: {
    background: "oklch(0.93 0.045 195)",
    surface: "oklch(1 0 0)",
    primary: "oklch(0.4 0.18 195)",
    text: "oklch(0.25 0.08 200)",
    border: "oklch(0.82 0.09 195)",
  },
  system: {
    background: "oklch(0.92 0.01 260)",
    surface: "oklch(0.98 0 0)",
    primary: "oklch(0.45 0.08 260)",
    text: "oklch(0.3 0.03 260)",
    border: "oklch(0.8 0.02 260)",
  },
};

/**
 * Renders a compact visual preview for one of the supported application themes.
 */
export function ThemePreview({
  theme,
  compact = false,
}: {
  theme: AppTheme;
  compact?: boolean;
}) {
  const colors = THEME_META[theme];
  if (!colors) return null;

  if (compact) {
    return (
      <span
        className="block h-4 w-7 shrink-0 rounded-sm"
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className="relative flex h-[42px] w-16 shrink-0 overflow-hidden rounded-[7px]"
      style={{
        backgroundColor: colors.background,
        border: `1px solid ${colors.border}`,
        boxShadow: `0 0 0 1px ${colors.border} inset`,
      }}
      aria-hidden="true"
    >
      <span
        className="absolute left-0 right-0 top-0 block"
        style={{ height: 8, backgroundColor: colors.surface }}
      />
      <span
        className="absolute left-2 block rounded-sm"
        style={{
          top: 13,
          width: "35%",
          height: 3,
          backgroundColor: colors.text,
          opacity: 0.35,
        }}
      />
      <span
        className="absolute left-2 block rounded-sm"
        style={{
          top: 20,
          width: 22,
          height: 14,
          backgroundColor: colors.primary,
          opacity: 0.7,
        }}
      />
      <span
        className="absolute left-[30px] block rounded-sm"
        style={{
          top: 20,
          width: 22,
          height: 14,
          backgroundColor: colors.text,
          opacity: 0.12,
          border: `1px solid ${colors.border}`,
        }}
      />
    </span>
  );
}
