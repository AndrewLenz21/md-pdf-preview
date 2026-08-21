/**
 * Renders the shared globe icon used by language preference triggers.
 */
export function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="8.75"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M3.75 12h16.5M12 3.25c2.1 2.35 3.15 5.27 3.15 8.75S14.1 18.4 12 20.75C9.9 18.4 8.85 15.48 8.85 12S9.9 5.6 12 3.25Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
