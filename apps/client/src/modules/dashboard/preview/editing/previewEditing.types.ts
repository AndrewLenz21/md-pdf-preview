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
  canEditFragment: (
    fragment: PageFragment,
    parentBlock: DocumentBlock,
  ) => boolean;
  isEditableFragment: (
    fragment: PageFragment,
    parentBlock: DocumentBlock,
  ) => boolean;
  onFragmentMouseDown: (
    event: React.MouseEvent<HTMLDivElement>,
    fragment: PageFragment,
    parentBlock: DocumentBlock,
  ) => void;
  onEditorMount: (
    editor: Editor,
    root: HTMLElement,
    fragment: PageFragment,
    parentBlock: DocumentBlock,
  ) => void;
  onPageEditorMount?: (
    editor: Editor,
    pageFrom: number,
    pageMarkdown: string,
  ) => void;
  onPageEditorChange?: (
    pageFrom: number,
    previousPageMarkdown: string,
    nextPageMarkdown: string,
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
