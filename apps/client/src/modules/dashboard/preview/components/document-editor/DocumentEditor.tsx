"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type MutableRefObject,
} from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { EditorState } from "@tiptap/pm/state";

import { createDocumentEditorExtensions } from "./extensions/documentEditorExtensions";
import { markdownToTiptapDocument } from "./markdown/documentToTiptap";
import { markdownPasteContent } from "./markdown/markdownPaste";
import { tiptapToMarkdown } from "./markdown/tiptapToMarkdown";
import { SelectionToolbar } from "./menus/SelectionToolbar";
import { SlashCommandMenu } from "./menus/SlashCommandMenu";

export function DocumentEditor({
  markdown,
  zoom,
  editorRef,
  onMarkdownChange,
  variant = "document",
  onEditorMount,
  onEditorUpdate,
  onEditorKeyDown,
}: {
  markdown: string;
  zoom: number;
  editorRef?: MutableRefObject<Editor | null>;
  onMarkdownChange?: (markdown: string) => void;
  variant?: "document" | "preview";
  onEditorMount?: (editor: Editor, root: HTMLElement) => void;
  onEditorUpdate?: (editor: Editor, root: HTMLElement) => void;
  onEditorKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}) {
  const onMarkdownChangeRef = useRef(onMarkdownChange);
  const lastSerializedMarkdownRef = useRef(markdown);
  const pendingEditorRef = useRef<Editor | null>(null);
  const serializeTimeoutRef = useRef<number | null>(null);
  const flushSerializationRef = useRef<() => void>(() => undefined);
  const editorInstanceRef = useRef<Editor | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const onEditorMountRef = useRef(onEditorMount);
  const onEditorUpdateRef = useRef(onEditorUpdate);
  const editor = useEditor(
    {
      extensions: createDocumentEditorExtensions(),
      content: markdownToTiptapDocument(markdown),
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            variant === "preview"
              ? "document-editor-content preview-fragment-editor-content"
              : "document-editor-content",
          spellcheck: "true",
          "aria-label":
            variant === "preview" ? "Preview document editor" : "Document editor",
        },
        handleDOMEvents: {
          blur: () => {
            flushSerializationRef.current();
            return false;
          },
        },
        handlePaste: (_view, event) => {
          const pastedText = event.clipboardData?.getData("text/plain") ?? "";
          const content = markdownPasteContent(pastedText);
          const currentEditor = editorInstanceRef.current;

          if (!content || !currentEditor) {
            return false;
          }

          event.preventDefault();
          currentEditor.commands.insertContent(content);
          return true;
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        pendingEditorRef.current = currentEditor;

        if (serializeTimeoutRef.current !== null) {
          window.clearTimeout(serializeTimeoutRef.current);
        }

        serializeTimeoutRef.current = window.setTimeout(() => {
          flushSerializationRef.current();
        }, 100);
      },
    },
    [],
  );

  useEffect(() => {
    onMarkdownChangeRef.current = onMarkdownChange;
    onEditorMountRef.current = onEditorMount;
    onEditorUpdateRef.current = onEditorUpdate;
  }, [onEditorMount, onEditorUpdate, onMarkdownChange]);

  useLayoutEffect(() => {
    const root = rootRef.current;

    if (editor && root) {
      onEditorMountRef.current?.(editor, root);
    }
  }, [editor, markdown, variant]);

  useEffect(() => {
    const flushSerialization = () => {
      if (serializeTimeoutRef.current !== null) {
        window.clearTimeout(serializeTimeoutRef.current);
        serializeTimeoutRef.current = null;
      }

      const currentEditor = pendingEditorRef.current;

      if (!currentEditor) {
        return;
      }

      pendingEditorRef.current = null;
      const nextMarkdown = tiptapToMarkdown(currentEditor);
      const root = rootRef.current;

      if (onEditorUpdateRef.current && root) {
        lastSerializedMarkdownRef.current = nextMarkdown;
        onEditorUpdateRef.current(currentEditor, root);
        return;
      }

      if (nextMarkdown !== lastSerializedMarkdownRef.current) {
        lastSerializedMarkdownRef.current = nextMarkdown;
        onMarkdownChangeRef.current?.(nextMarkdown);
      }
    };

    flushSerializationRef.current = flushSerialization;

    return () => {
      flushSerialization();
      flushSerializationRef.current = () => undefined;
    };
  }, []);

  useEffect(() => {
    editorInstanceRef.current = editor;

    if (editorRef) {
      editorRef.current = editor;
    }

    return () => {
      editorInstanceRef.current = null;

      if (editorRef) {
        editorRef.current = null;
      }
    };
  }, [editor, editorRef]);

  useEffect(() => {
    if (!editor || markdown === lastSerializedMarkdownRef.current) {
      return;
    }

    flushSerializationRef.current();

    const nextDocument = editor.schema.nodeFromJSON(
      markdownToTiptapDocument(markdown),
    );
    editor.view.updateState(
      EditorState.create({
        doc: nextDocument,
        plugins: editor.state.plugins,
        schema: editor.schema,
      }),
    );
    lastSerializedMarkdownRef.current = markdown;
  }, [editor, markdown]);

  return (
    <div
      ref={rootRef}
      className={
          variant === "preview"
          ? "preview-fragment-editor"
          : "document-editor-workspace"
      }
      onKeyDownCapture={onEditorKeyDown}
    >
      <div
        className={
          variant === "preview"
            ? "preview-fragment-editor-column"
            : "document-editor-column"
        }
        data-document-editor-content={variant === "document" ? true : undefined}
      >
        <div
          className="document-editor-content-host"
          style={{ "--document-editor-zoom": zoom / 100 } as React.CSSProperties}
        >
        {editor ? (
          <>
            <EditorContent editor={editor} />
            <SlashCommandMenu editor={editor} />
            <SelectionToolbar editor={editor} />
          </>
        ) : null}
        </div>
      </div>
    </div>
  );
}
