import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { useDocumentDndStore } from "@/modules/dashboard/stores";
import type { DocumentSource } from "@/modules/dashboard/document/model/document.types";

export type LongPressDragItem = {
  kind: "document" | "folder";
  id: string;
  source?: DocumentSource;
};

export type LongPressDragPosition = {
  x: number;
  y: number;
};

export type LongPressDragPreviewPhase = "enter" | "exit" | "return";

export type LongPressDropTarget =
  | { kind: "folder"; source: DocumentSource; folderId: string }
  | { kind: "root"; source: DocumentSource }
  | { kind: "source-toggle"; source: DocumentSource };

type PendingDrag = {
  item: LongPressDragItem;
  pointerId: number;
  startX: number;
  startY: number;
  timeoutId: ReturnType<typeof setTimeout>;
};

export function useLongPressDrag({
  onDrop,
  onTargetChange,
  onDragEnd,
}: {
  onDrop: (item: LongPressDragItem, target: LongPressDropTarget) => boolean;
  onTargetChange?: (
    item: LongPressDragItem,
    target: LongPressDropTarget | null,
  ) => void;
  onDragEnd?: () => void;
}) {
  const [draggingItem, setDraggingItem] = useState<LongPressDragItem | null>(
    null,
  );
  const [dropTarget, setDropTarget] = useState<LongPressDropTarget | null>(
    null,
  );
  const [dragPosition, setDragPosition] =
    useState<LongPressDragPosition | null>(null);
  const [dragPreviewItem, setDragPreviewItem] =
    useState<LongPressDragItem | null>(null);
  const [dragPreviewPhase, setDragPreviewPhase] =
    useState<LongPressDragPreviewPhase | null>(null);
  const pendingDragRef = useRef<PendingDrag | null>(null);
  const activeDragRef = useRef<LongPressDragItem | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const dropTargetRef = useRef<LongPressDropTarget | null>(null);
  const previewExitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const suppressClickRef = useRef(false);
  const onDropRef = useRef(onDrop);
  const onTargetChangeRef = useRef(onTargetChange);
  const onDragEndRef = useRef(onDragEnd);
  const originPositionRef = useRef<LongPressDragPosition | null>(null);

  useEffect(() => {
    onDropRef.current = onDrop;
    onTargetChangeRef.current = onTargetChange;
    onDragEndRef.current = onDragEnd;
  }, [onDragEnd, onDrop, onTargetChange]);

  useEffect(() => {
    const clearPendingDrag = () => {
      const pendingDrag = pendingDragRef.current;

      if (pendingDrag) {
        clearTimeout(pendingDrag.timeoutId);
        pendingDragRef.current = null;
      }
    };

    const finishPreview = (returnToOrigin = false) => {
      if (returnToOrigin && originPositionRef.current) {
        setDragPreviewPhase("return");
        requestAnimationFrame(() => {
          if (originPositionRef.current) {
            setDragPosition(originPositionRef.current);
          }
        });
      } else {
        setDragPreviewPhase("exit");
      }

      if (previewExitTimeoutRef.current) {
        clearTimeout(previewExitTimeoutRef.current);
      }

      previewExitTimeoutRef.current = setTimeout(
        () => {
          setDragPreviewItem(null);
          setDragPreviewPhase(null);
          setDragPosition(null);
          useDocumentDndStore.getState().setDragging(false);
          previewExitTimeoutRef.current = null;
        },
        returnToOrigin ? 220 : 180,
      );
    };

    const getSource = (value: string | undefined): DocumentSource | null =>
      value === "local" || value === "cloud" ? value : null;

    const getDropTarget = (clientX: number, clientY: number) => {
      const element = document.elementFromPoint(clientX, clientY);
      const folderElement = element?.closest<HTMLElement>(
        "[data-dnd-folder-id]",
      );

      if (folderElement) {
        const source = getSource(folderElement.dataset.dndSource);
        const folderId = folderElement.dataset.dndFolderId;

        return source && folderId
          ? { kind: "folder" as const, source, folderId }
          : null;
      }

      const sourceTarget = element?.closest<HTMLElement>(
        "[data-dnd-source-target]",
      );
      const source = getSource(sourceTarget?.dataset.dndSourceTarget);

      if (source) {
        return { kind: "source-toggle" as const, source };
      }

      const rootElement = element?.closest<HTMLElement>("[data-dnd-root-drop]");
      const rootSource = getSource(rootElement?.dataset.dndSource);

      return rootSource ? { kind: "root" as const, source: rootSource } : null;
    };

    const updateDropTarget = (clientX: number, clientY: number) => {
      const nextTarget = getDropTarget(clientX, clientY);

      dropTargetRef.current = nextTarget;
      setDropTarget(nextTarget);
      const activeDrag = activeDragRef.current;

      if (activeDrag) {
        onTargetChangeRef.current?.(activeDrag, nextTarget);
      }
    };

    const finishDrag = (event: PointerEvent, cancel: boolean) => {
      const activeDrag = activeDragRef.current;

      clearPendingDrag();

      let accepted = false;

      if (activeDrag && !cancel) {
        const nextTarget = getDropTarget(event.clientX, event.clientY);

        if (nextTarget) {
          accepted = onDropRef.current(activeDrag, nextTarget);
        }

        suppressClickRef.current = true;
      }

      activeDragRef.current = null;
      activePointerIdRef.current = null;
      dropTargetRef.current = null;
      setDraggingItem(null);
      if (activeDrag) {
        finishPreview(!cancel && !accepted);
      }
      setDropTarget(null);
      if (activeDrag) {
        onTargetChangeRef.current?.(activeDrag, null);
      }
      onDragEndRef.current?.();
    };

    const handlePointerMove = (event: PointerEvent) => {
      const pendingDrag = pendingDragRef.current;
      const activeDrag = activeDragRef.current;

      if (!pendingDrag && !activeDrag) {
        return;
      }

      const pointerId = pendingDrag?.pointerId ?? activePointerIdRef.current;
      if (pointerId === null || event.pointerId !== pointerId) {
        return;
      }

      if (pendingDrag && !activeDrag) {
        const distance = Math.hypot(
          event.clientX - pendingDrag.startX,
          event.clientY - pendingDrag.startY,
        );

        if (distance > 8) {
          clearPendingDrag();
        }

        return;
      }

      event.preventDefault();
      setDragPosition({ x: event.clientX, y: event.clientY });
      updateDropTarget(event.clientX, event.clientY);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const pointerId =
        pendingDragRef.current?.pointerId ?? activePointerIdRef.current;

      if (pointerId !== null && pointerId !== event.pointerId) {
        return;
      }

      finishDrag(event, false);
    };

    const handlePointerCancel = (event: PointerEvent) => {
      const pointerId =
        pendingDragRef.current?.pointerId ?? activePointerIdRef.current;

      if (pointerId !== null && pointerId !== event.pointerId) {
        return;
      }

      finishDrag(event, true);
    };

    const handleSelectStart = (event: Event) => {
      if (activeDragRef.current) {
        event.preventDefault();
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      if (activeDragRef.current) {
        event.preventDefault();
      }
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      clearPendingDrag();
      if (previewExitTimeoutRef.current) {
        clearTimeout(previewExitTimeoutRef.current);
      }
      useDocumentDndStore.getState().setDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const startLongPress = (
    item: LongPressDragItem,
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (
      (event.pointerType === "mouse" && event.button !== 0) ||
      (event.target instanceof Element &&
        event.target.closest("[data-dnd-ignore]"))
    ) {
      return;
    }

    if (pendingDragRef.current || activeDragRef.current) {
      return;
    }

    if (previewExitTimeoutRef.current) {
      clearTimeout(previewExitTimeoutRef.current);
      previewExitTimeoutRef.current = null;
      setDragPreviewItem(null);
      setDragPreviewPhase(null);
      setDragPosition(null);
      useDocumentDndStore.getState().setDragging(false);
    }

    const timeoutId = setTimeout(() => {
      const pendingDrag = pendingDragRef.current;

      if (!pendingDrag) {
        return;
      }

      pendingDragRef.current = null;
      activeDragRef.current = pendingDrag.item;
      activePointerIdRef.current = pendingDrag.pointerId;
      if (previewExitTimeoutRef.current) {
        clearTimeout(previewExitTimeoutRef.current);
        previewExitTimeoutRef.current = null;
      }
      setDraggingItem(pendingDrag.item);
      setDragPreviewItem(pendingDrag.item);
      setDragPreviewPhase("enter");
      setDragPosition({ x: pendingDrag.startX, y: pendingDrag.startY });
      useDocumentDndStore.getState().setDragging(true);
      originPositionRef.current = {
        x: pendingDrag.startX,
        y: pendingDrag.startY,
      };
      dropTargetRef.current = null;
      setDropTarget(null);
    }, 500);

    pendingDragRef.current = {
      item,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      timeoutId,
    };
  };

  const suppressClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  return {
    draggingItem,
    dragPosition,
    dragPreviewItem,
    dragPreviewPhase,
    dropTarget,
    dropTargetFolderId:
      dropTarget?.kind === "folder" ? dropTarget.folderId : null,
    startLongPress,
    suppressClick,
  };
}
