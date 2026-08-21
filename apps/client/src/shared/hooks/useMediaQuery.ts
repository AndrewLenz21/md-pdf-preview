"use client";

import { useCallback, useSyncExternalStore } from "react";

import { useIsMounted } from "./useIsMounted";

/**
 * Tracks a media query without rendering a desktop or mobile branch during
 * hydration. Returning null until mount keeps responsive trees deterministic,
 * while the subscription updates immediately when the viewport changes.
 */
export function useMediaQuery(query: string) {
  const mounted = useIsMounted();
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined") {
        return () => {};
      }

      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onStoreChange);

      return () => mediaQuery.removeEventListener("change", onStoreChange);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
    [query],
  );
  const getServerSnapshot = useCallback(() => false, []);
  const matches = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return mounted ? matches : null;
}
