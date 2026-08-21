"use client";

import { useSyncExternalStore } from "react";

const subscribeToMount = () => () => {};
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

/**
 * Returns a hydration-safe flag that becomes true once the component is mounted
 * in the browser. The external-store API keeps the server and client snapshots
 * deterministic without introducing an extra render-only state effect.
 */
export function useIsMounted() {
  return useSyncExternalStore(
    subscribeToMount,
    getClientMountSnapshot,
    getServerMountSnapshot,
  );
}
