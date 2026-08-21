"use client";

import { useEffect, useRef, type RefObject } from "react";

type DismissableLayerOptions = {
  enabled?: boolean;
  refs: readonly RefObject<HTMLElement | null>[];
  onDismiss: () => void;
};

/**
 * Closes an interactive layer when the user presses Escape or starts a pointer
 * interaction outside all supplied refs. Refs are kept in a mutable snapshot
 * so portaled elements and changing callback identities do not require the
 * document listeners to be recreated on every render.
 */
export function useDismissableLayer({
  enabled = true,
  refs,
  onDismiss,
}: DismissableLayerOptions) {
  const refsRef = useRef(refs);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    refsRef.current = refs;
    onDismissRef.current = onDismiss;
  }, [onDismiss, refs]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      const clickedInside = refsRef.current.some((ref) =>
        ref.current?.contains(target),
      );

      if (!clickedInside) {
        onDismissRef.current();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismissRef.current();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [enabled]);
}
