import type { Locale } from "@/core/i18n";

/**
 * Renders the small flag illustration used by language selectors and dialogs.
 */
export function FlagIcon({ country }: { country: Locale }) {
  if (country === "en") {
    return (
      <svg viewBox="0 0 640 480" className="h-full w-full" aria-hidden="true">
        <path fill="#bd3d44" d="M0 0h640v480H0" />
        <path
          stroke="#fff"
          strokeWidth="37"
          d="M0 55.3h640M0 129h640M0 202.8h640M0 276.5h640M0 350.2h640M0 424h640"
        />
        <path fill="#192f5d" d="M0 0h281.6v258.5H0" />
        <g fill="#fff">
          <circle cx="42" cy="52" r="12" />
          <circle cx="126" cy="52" r="12" />
          <circle cx="210" cy="52" r="12" />
          <circle cx="42" cy="129" r="12" />
          <circle cx="126" cy="129" r="12" />
          <circle cx="210" cy="129" r="12" />
          <circle cx="42" cy="206" r="12" />
          <circle cx="126" cy="206" r="12" />
          <circle cx="210" cy="206" r="12" />
        </g>
      </svg>
    );
  }

  if (country === "es") {
    return (
      <svg viewBox="0 0 640 480" className="h-full w-full" aria-hidden="true">
        <path fill="#c60b1e" d="M0 0h640v480H0" />
        <path fill="#ffc400" d="M0 120h640v240H0" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 640 480" className="h-full w-full" aria-hidden="true">
      <path fill="#fff" d="M0 0h640v480H0" />
      <path fill="#009246" d="M0 0h213.3v480H0" />
      <path fill="#ce2b37" d="M426.7 0H640v480H426.7" />
    </svg>
  );
}
