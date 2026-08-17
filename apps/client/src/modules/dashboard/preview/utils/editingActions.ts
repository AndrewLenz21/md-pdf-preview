import type { Editor } from "@tiptap/core";
import type { RefObject } from "react";

import type { DocumentEditorMode } from "@/modules/dashboard/types/editor.types";

export type EditingActions = {
  selectAll: () => void;
  copy: () => Promise<void>;
  paste: () => Promise<void>;
  print: () => void;
};

type EditingActionContext = {
  modeRef: RefObject<DocumentEditorMode>;
  markdownRef: RefObject<string>;
  markdownEditorRef: RefObject<HTMLTextAreaElement | null>;
  documentEditorRef: RefObject<Editor | null>;
  onMarkdownChangeRef: RefObject<((markdown: string) => void) | null>;
};

async function readClipboardText() {
  if (!navigator.clipboard?.readText) {
    return "";
  }

  return navigator.clipboard.readText();
}

async function writeClipboardText(text: string) {
  if (!navigator.clipboard?.writeText) {
    return;
  }

  await navigator.clipboard.writeText(text);
}

export function createEditingActions(
  context: EditingActionContext,
): EditingActions {
  return {
    selectAll: () => {
      switch (context.modeRef.current) {
        case "markdown": {
          const textarea = context.markdownEditorRef.current;

          if (!textarea) {
            return;
          }

          textarea.focus({ preventScroll: true });
          textarea.select();
          return;
        }
        case "document":
          context.documentEditorRef.current?.chain().focus().selectAll().run();
          return;
        case "preview":
          return;
      }
    },

    copy: async () => {
      switch (context.modeRef.current) {
        case "markdown": {
          const textarea = context.markdownEditorRef.current;
          const markdown = context.markdownRef.current;

          if (!textarea) {
            return;
          }

          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          await writeClipboardText(
            start !== end ? markdown.slice(start, end) : markdown,
          );
          return;
        }
        case "document": {
          const editor = context.documentEditorRef.current;

          if (!editor) {
            return;
          }

          const { from, to, empty } = editor.state.selection;
          const text = empty
            ? editor.state.doc.textContent
            : editor.state.doc.textBetween(from, to, "\n", "\n");

          await writeClipboardText(text);
          return;
        }
        case "preview":
          return;
      }
    },

    paste: async () => {
      if (context.modeRef.current === "preview") {
        return;
      }

      const text = await readClipboardText();

      if (!text) {
        return;
      }

      switch (context.modeRef.current) {
        case "markdown": {
          const textarea = context.markdownEditorRef.current;

          if (!textarea) {
            return;
          }

          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const nextMarkdown =
            textarea.value.slice(0, start) + text + textarea.value.slice(end);
          const nextCaret = start + text.length;

          textarea.focus({ preventScroll: true });
          textarea.setRangeText(text, start, end, "end");
          textarea.setSelectionRange(nextCaret, nextCaret);
          context.onMarkdownChangeRef.current?.(nextMarkdown);
          return;
        }
        case "document":
          context.documentEditorRef.current
            ?.chain()
            .focus()
            .insertContent(text)
            .run();
          return;
      }
    },

    print: () => {
      if (context.modeRef.current === "preview") {
        window.print();
      }
    },
  };
}
