"use client";

import { useState } from "react";

import type { DocumentBlock } from "@/modules/dashboard/document/model/document-block.types";

import type { PageFragment } from "../components/paper-preview/pagination/pagination.types";
import {
  getSourceBookmarkAtSelection,
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
  return {
    isEditableFragment: (fragment, parentBlock) =>
      enabled && isEditablePreviewFragment(fragment, parentBlock),
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
