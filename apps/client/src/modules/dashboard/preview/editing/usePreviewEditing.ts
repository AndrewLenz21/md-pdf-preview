"use client";

import { useRef, useState } from "react";
import type { Editor } from "@tiptap/core";

import type { DocumentBlock } from "@/modules/dashboard/document/model/document-block.types";

import type { PageFragment } from "../components/paper-preview/pagination/pagination.types";
import {
  getSourceBookmarkAtSelection,
  getSourceBookmarkAtPoint,
  getPreviewListSelection,
  isEditablePreviewFragment,
  restoreSourceBookmark,
} from "./selectionMapping";
import type {
  PreviewEditingController,
  PreviewSourceBookmark,
} from "./previewEditing.types";
import { tiptapToMarkdown } from "../components/document-editor/markdown/tiptapToMarkdown";

function replaceFragmentSource(
  markdown: string,
  fragment: PageFragment,
  parentBlock: DocumentBlock,
  nextFragmentSource: string,
) {
  const nextParentSource =
    parentBlock.source.slice(0, fragment.sourceRange.from) +
    nextFragmentSource +
    parentBlock.source.slice(fragment.sourceRange.to);

  return (
    markdown.slice(0, parentBlock.range.start) +
    nextParentSource +
    markdown.slice(parentBlock.range.end)
  );
}

function isBookmarkInFragment(
  bookmark: PreviewSourceBookmark | null,
  fragment: PageFragment,
  parentBlock: DocumentBlock,
) {
  const fragmentStart = parentBlock.range.start + fragment.sourceRange.from;
  const fragmentEnd = parentBlock.range.start + fragment.sourceRange.to;

  if (!bookmark) {
    return false;
  }

  if (bookmark.parentBlockId !== parentBlock.id) {
    return (
      bookmark.documentOffset >= fragmentStart &&
      bookmark.documentOffset < fragmentEnd
    );
  }

  return (
    bookmark.documentOffset >= fragmentStart &&
    (bookmark.documentOffset < fragmentEnd ||
      (bookmark.documentOffset === fragmentEnd &&
        fragment.sourceRange.to === parentBlock.source.length))
  );
}

function getMarkdownChange(
  previousMarkdown: string,
  nextMarkdown: string,
) {
  let from = 0;

  while (
    from < previousMarkdown.length &&
    from < nextMarkdown.length &&
    previousMarkdown[from] === nextMarkdown[from]
  ) {
    from += 1;
  }

  let previousTo = previousMarkdown.length;
  let nextTo = nextMarkdown.length;

  while (
    previousTo > from &&
    nextTo > from &&
    previousMarkdown[previousTo - 1] === nextMarkdown[nextTo - 1]
  ) {
    previousTo -= 1;
    nextTo -= 1;
  }

  return {
    from,
    previousTo,
    nextLength: nextTo - from,
  };
}

function getEditorPositionAtTextOffset(editor: Editor, targetOffset: number) {
  const documentSize = editor.state.doc.content.size;
  let bestPosition = 1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let position = 1; position <= documentSize; position += 1) {
    const renderedOffset = editor.state.doc.textBetween(0, position, "\n\n").length;
    const distance = Math.abs(renderedOffset - targetOffset);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestPosition = position;
    }

    if (distance === 0 && renderedOffset >= targetOffset) {
      break;
    }
  }

  return bestPosition;
}

export function usePreviewEditing({
  enabled = true,
  markdown,
  onMarkdownChange,
}: {
  enabled?: boolean;
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
}): PreviewEditingController {
  const [bookmark, setBookmark] = useState<PreviewSourceBookmark | null>(null);
  const [activeFragmentId, setActiveFragmentId] = useState<string | null>(null);
  const activationPointRef = useRef<{ left: number; top: number } | null>(null);
  const canEditFragment = (fragment: PageFragment, parentBlock: DocumentBlock) =>
    enabled && isEditablePreviewFragment(fragment, parentBlock);
  const isActiveFragment = (
    fragment: PageFragment,
    parentBlock: DocumentBlock,
  ) =>
    activeFragmentId === fragment.id ||
    isBookmarkInFragment(bookmark, fragment, parentBlock);

  return {
    canEditFragment,
    isEditableFragment: (fragment, parentBlock) =>
      canEditFragment(fragment, parentBlock) &&
      isActiveFragment(fragment, parentBlock),
    onFragmentMouseDown: (event, fragment, parentBlock) => {
      if (
        isActiveFragment(fragment, parentBlock) ||
        !canEditFragment(fragment, parentBlock)
      ) {
        return;
      }

      const nextBookmark = getSourceBookmarkAtPoint(
        event,
        fragment,
        parentBlock,
      );

      if (!nextBookmark) {
        return;
      }

      event.preventDefault();
      activationPointRef.current = {
        left: event.clientX,
        top: event.clientY,
      };
      setBookmark(nextBookmark);
      setActiveFragmentId(fragment.id);
    },
    onEditorMount: (editor, root, fragment, parentBlock) => {
      if (!enabled || !isEditablePreviewFragment(fragment, parentBlock)) {
        return;
      }

      if (!bookmark) {
        return;
      }

      const documentFrom = parentBlock.range.start + fragment.sourceRange.from;
      const documentTo = parentBlock.range.start + fragment.sourceRange.to;

      if (
        bookmark.documentOffset >= documentFrom &&
        bookmark.documentOffset <= documentTo
      ) {
        restoreSourceBookmark(root, fragment, parentBlock, bookmark);
      }
    },
    onPageEditorMount: (editor, pageFrom, pageMarkdown) => {
      const point = activationPointRef.current;
      activationPointRef.current = null;
      const position = point ? editor.view.posAtCoords(point) : null;

      if (position) {
        editor.commands.focus(position.pos);
      } else if (
        bookmark &&
        bookmark.documentOffset >= pageFrom &&
        bookmark.documentOffset <= pageFrom + pageMarkdown.length
      ) {
        const sourceOffset = bookmark.documentOffset - pageFrom;
        const renderedLength = editor.state.doc.textBetween(
          0,
          editor.state.doc.content.size,
          "\n\n",
        ).length;
        editor.commands.focus(
          getEditorPositionAtTextOffset(
            editor,
            Math.min(sourceOffset, renderedLength),
          ),
        );
      } else {
        editor.commands.focus();
      }
    },
    onPageEditorChange: (pageFrom, previousPageMarkdown, nextPageMarkdown) => {
      if (previousPageMarkdown === nextPageMarkdown) {
        return;
      }

      const change = getMarkdownChange(previousPageMarkdown, nextPageMarkdown);

      setBookmark((currentBookmark) => {
        if (!currentBookmark) {
          return currentBookmark;
        }

        const localOffset = currentBookmark.documentOffset - pageFrom;

        if (localOffset < 0 || localOffset > previousPageMarkdown.length) {
          return currentBookmark;
        }

        const nextLocalOffset =
          localOffset < change.from
            ? localOffset
            : localOffset >= change.previousTo
              ? localOffset +
                change.nextLength -
                (change.previousTo - change.from)
              : change.from + change.nextLength;
        const nextDocumentOffset = pageFrom + nextLocalOffset;
        const documentOffsetDelta =
          nextDocumentOffset - currentBookmark.documentOffset;

        return {
          ...currentBookmark,
          documentOffset: nextDocumentOffset,
          sourceOffset: Math.max(
            0,
            currentBookmark.sourceOffset + documentOffsetDelta,
          ),
        };
      });
    },
    onEditorChange: (editor, root, fragment, parentBlock) => {
      if (!enabled || !isEditablePreviewFragment(fragment, parentBlock)) {
        return;
      }

      const nextFragmentSource = tiptapToMarkdown(editor);
      const nextBookmark = getSourceBookmarkAtSelection(
        root,
        fragment,
        parentBlock,
        editor,
        nextFragmentSource.length,
      );

      if (nextBookmark) {
        setBookmark(nextBookmark);
      }

      if (nextFragmentSource === fragment.source) {
        return;
      }

      onMarkdownChange(
        replaceFragmentSource(
          markdown,
          fragment,
          parentBlock,
          nextFragmentSource,
        ),
      );
    },
    onEditorKeyDown: (event, root, fragment, parentBlock) => {
      if (
        !enabled ||
        event.key !== "Enter" ||
        event.shiftKey ||
        !isEditablePreviewFragment(fragment, parentBlock)
      ) {
        return;
      }

      if (parentBlock.kind === "list") {
        const listSelection = getPreviewListSelection(root, fragment, parentBlock);

        if (!listSelection) {
          return;
        }

        const itemFrom = listSelection.item.from - fragment.sourceRange.from;
        const itemTo = listSelection.item.to - fragment.sourceRange.from;
        const itemSource = fragment.source.slice(itemFrom, itemTo);
        const cursorOffset = Math.min(
          itemSource.length,
          listSelection.item.prefix.length + listSelection.textOffset,
        );
        const nextItemSource =
          itemSource.slice(0, cursorOffset) +
          `\n${listSelection.item.nextPrefix}` +
          itemSource.slice(cursorOffset);
        const nextFragmentSource =
          fragment.source.slice(0, itemFrom) +
          nextItemSource +
          fragment.source.slice(itemTo);
        const nextDocumentOffset =
          parentBlock.range.start +
          listSelection.item.from +
          cursorOffset +
          1 +
          listSelection.item.nextPrefix.length;

        event.preventDefault();
        setBookmark({
          parentBlockId: parentBlock.id,
          sourceOffset: nextDocumentOffset - parentBlock.range.start,
          documentOffset: nextDocumentOffset,
          listItemIndex: listSelection.item.index + 1,
        });
        onMarkdownChange(
          replaceFragmentSource(
            markdown,
            fragment,
            parentBlock,
            nextFragmentSource,
          ),
        );
        return;
      }

      if (parentBlock.kind !== "paragraph" && parentBlock.kind !== "heading") {
        return;
      }

      const currentBookmark = getSourceBookmarkAtSelection(
        root,
        fragment,
        parentBlock,
      );

      if (!currentBookmark) {
        return;
      }

      const splitOffset = currentBookmark.sourceOffset - fragment.sourceRange.from;
      const fragmentLength = fragment.source.length;

      if (splitOffset >= fragmentLength) {
        return;
      }

      const nextFragmentSource =
        fragment.source.slice(0, splitOffset) +
        "\n\n" +
        fragment.source.slice(splitOffset);
      const nextDocumentOffset =
        parentBlock.range.start +
        fragment.sourceRange.from +
        splitOffset +
        2;

      event.preventDefault();
      setBookmark({
        parentBlockId: parentBlock.id,
        sourceOffset: nextDocumentOffset - parentBlock.range.start,
        documentOffset: nextDocumentOffset,
      });
      onMarkdownChange(
        replaceFragmentSource(
          markdown,
          fragment,
          parentBlock,
          nextFragmentSource,
        ),
      );
    },
  };
}
