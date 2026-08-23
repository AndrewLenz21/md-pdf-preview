"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { Editor, JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { EditorState } from "@tiptap/pm/state";

import { createDocumentEditorExtensions } from "./extensions/documentEditorExtensions";
import { markdownToTiptapDocument } from "./markdown/documentToTiptap";
import { markdownPasteContent } from "./markdown/markdownPaste";
import { tiptapToMarkdown } from "./markdown/tiptapToMarkdown";
import { SelectionToolbar } from "./menus/SelectionToolbar";
import { SlashCommandMenu } from "./menus/SlashCommandMenu";

function hasOnlySyntheticTrailingParagraph(editor: Editor, markdown: string) {
  const trailingNode = editor.state.doc.lastChild;

  if (
    !trailingNode ||
    trailingNode.type.name !== "paragraph" ||
    trailingNode.content.size > 0
  ) {
    return false;
  }

  if (editor.state.selection.$from.parent === trailingNode) {
    return false;
  }

  const contentEnd = editor.state.doc.content.size - trailingNode.nodeSize;
  const documentWithoutTrailingParagraph = editor.state.doc.copy(
    editor.state.doc.content.cut(0, contentEnd),
  );
  const expectedDocument = editor.schema.nodeFromJSON(
    markdownToTiptapDocument(markdown),
  );

  return documentWithoutTrailingParagraph.eq(expectedDocument);
}

function getEditorDocumentContent(
  markdown: string,
  variant: "document" | "preview",
) {
  const document = markdownToTiptapDocument(markdown);

  if (variant === "preview") {
    return document;
  }

  const content = document.content ?? [];
  const lastNode = content.at(-1);
  const hasEmptyTrailingParagraph =
    lastNode?.type === "paragraph" &&
    (!lastNode.content || lastNode.content.length === 0);

  if (hasEmptyTrailingParagraph) {
    return document;
  }

  return {
    ...document,
    content: [...content, { type: "paragraph" } satisfies JSONContent],
  };
}

function ensureDocumentTrailingParagraph(editor: Editor) {
  const lastNode = editor.state.doc.lastChild;

  if (
    lastNode?.type.name === "paragraph" &&
    lastNode.content.size === 0
  ) {
    return;
  }

  const paragraph = editor.schema.nodes.paragraph.create();
  editor.view.dispatch(
    editor.state.tr.insert(editor.state.doc.content.size, paragraph),
  );
}

export function DocumentEditor({
  markdown,
  zoom,
  editorRef,
  onMarkdownChange,
  variant = "document",
  page = false,
  fallback,
  onEditorMount,
  onEditorUpdate,
  onEditorKeyDown,
  editable = true,
}: {
  markdown: string;
  zoom: number;
  editorRef?: MutableRefObject<Editor | null>;
  onMarkdownChange?: (markdown: string) => void;
  variant?: "document" | "preview";
  page?: boolean;
  fallback?: ReactNode;
  onEditorMount?: (editor: Editor, root: HTMLElement) => void;
  onEditorUpdate?: (editor: Editor, root: HTMLElement) => void;
  onEditorKeyDown?: (
    event: React.KeyboardEvent<HTMLDivElement>,
    editor: Editor,
    flushSerialization: () => void,
  ) => void;
  editable?: boolean;
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
  const mountedEditorRef = useRef<Editor | null>(null);
  const editor = useEditor(
    {
       extensions: createDocumentEditorExtensions({
         disableTrailingNode: variant === "preview",
       }),
       content: getEditorDocumentContent(markdown, variant),
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            variant === "preview"
              ? `document-editor-content preview-fragment-editor-content${page ? " preview-page-editor-content" : ""}`
              : "document-editor-content",
          spellcheck: "false",
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

            if (!content || !currentEditor || !currentEditor.isEditable) {
              return false;
            }

          event.preventDefault();
          currentEditor.commands.insertContent(content);
          return true;
        },
      },
      editable,
      onUpdate: ({ editor: currentEditor }) => {
        if (variant === "document") {
          ensureDocumentTrailingParagraph(currentEditor);
        }

        if (
          variant === "document" &&
          hasOnlySyntheticTrailingParagraph(
            currentEditor,
            lastSerializedMarkdownRef.current,
          )
        ) {
          return;
        }

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
      if (page && mountedEditorRef.current === editor) {
        return;
      }

      onEditorMountRef.current?.(editor, root);
      mountedEditorRef.current = editor;
    }
  }, [editor, markdown, page, variant]);

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
    if (!editor) {
      return;
    }

    editor.setEditable(editable);
    if (!editable) {
      editor.commands.blur();
    }
  }, [editable, editor]);

  useEffect(() => {
    if (!editor || markdown === lastSerializedMarkdownRef.current) {
      return;
    }

    if (page) {
      return;
    }

    flushSerializationRef.current();

    const nextDocument = editor.schema.nodeFromJSON(
      getEditorDocumentContent(markdown, variant),
    );
    editor.view.updateState(
      EditorState.create({
      doc: nextDocument,
      plugins: editor.state.plugins,
      schema: editor.schema,
      }),
    );
    lastSerializedMarkdownRef.current = markdown;
  }, [editor, markdown, page, variant]);

  return (
    <div
      ref={rootRef}
      className={
          variant === "preview"
          ? `preview-fragment-editor${page ? " preview-page-editor" : ""}`
          : "document-editor-workspace"
      }
      onKeyDownCapture={(event) => {
        if (editor) {
          if (editable) {
            onEditorKeyDown?.(event, editor, flushSerializationRef.current);
          }
        }
      }}
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
            {editable ? <SlashCommandMenu editor={editor} /> : null}
            {editable ? <SelectionToolbar editor={editor} /> : null}
          </>
        ) : (
          fallback
        )}
        </div>
      </div>
    </div>
  );
}
