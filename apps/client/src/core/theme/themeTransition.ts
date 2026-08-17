const THEME_TRANSITION_CLASS = "theme-transitioning";
const THEME_TRANSITION_CLEANUP_DELAY = 350;

let cleanupTimer: number | undefined;

export function startThemeTransition() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const root = document.documentElement;
  root.classList.add(THEME_TRANSITION_CLASS);

  if (cleanupTimer !== undefined) {
    window.clearTimeout(cleanupTimer);
  }

  cleanupTimer = window.setTimeout(() => {
    root.classList.remove(THEME_TRANSITION_CLASS);
    cleanupTimer = undefined;
  }, THEME_TRANSITION_CLEANUP_DELAY);
}
