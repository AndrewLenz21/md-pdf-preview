import type { Editor } from "@tiptap/core";

import type { DocumentBlock } from "@/modules/dashboard/document/model/document-block.types";

import type { PageFragment } from "../components/paper-preview/pagination/pagination.types";

export type PreviewSourceBookmark = {
  parentBlockId: string;
  sourceOffset: number;
  documentOffset: number;
  listItemIndex?: number;
};

export type PreviewEditingController = {
  isEditableFragment: (
    fragment: PageFragment,
    parentBlock: DocumentBlock,
  ) => boolean;
  onEditorMount: (
    editor: Editor,
    root: HTMLElement,
    fragment: PageFragment,
    parentBlock: DocumentBlock,
  ) => void;
  onEditorChange: (
    editor: Editor,
    root: HTMLElement,
    fragment: PageFragment,
    parentBlock: DocumentBlock,
  ) => void;
  onEditorKeyDown: (
    event: React.KeyboardEvent<HTMLDivElement>,
    root: HTMLElement,
    fragment: PageFragment,
    parentBlock: DocumentBlock,
  ) => void;
};
