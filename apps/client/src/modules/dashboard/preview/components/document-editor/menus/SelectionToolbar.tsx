"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";

type SelectionToolbarState = {
  top: number;
  left: number;
};

export function SelectionToolbar({ editor }: { editor: Editor }) {
  const [toolbarState, setToolbarState] = useState<SelectionToolbarState | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("");

  useEffect(() => {
    const update = () => {
      const { from, to } = editor.state.selection;

      if (!editor.isFocused || from === to) {
        setToolbarState(null);
        return;
      }

      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const width = 236;
      const availableWidth = Math.min(width, window.innerWidth - 16);
      const left = Math.min(
        Math.max(8, (start.left + end.right) / 2 - availableWidth / 2),
        window.innerWidth - availableWidth - 8,
      );
      const top = Math.min(
        Math.max(8, start.top - 48),
        Math.max(8, window.innerHeight - 48),
      );

      setToolbarState({ top, left });
    };

    update();
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);

    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
        return;
      }

      if (editor.state.selection.empty) {
        return;
      }

      event.preventDefault();
      setLinkHref(editor.getAttributes("link").href ?? "");
      setLinkOpen(true);
    };

    editor.view.dom.addEventListener("keydown", handleKeyDown, true);

    return () => editor.view.dom.removeEventListener("keydown", handleKeyDown, true);
  }, [editor]);

  if (!toolbarState) {
    return null;
  }

  const runMarkCommand = (command: () => boolean) => {
    command();
  };

  return (
    <div
      className="document-editor-selection-toolbar"
      style={{ top: toolbarState.top, left: toolbarState.left }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <button type="button" onClick={() => runMarkCommand(() => editor.chain().focus().toggleBold().run())} aria-label="Bold">
        <strong>B</strong>
      </button>
      <button type="button" onClick={() => runMarkCommand(() => editor.chain().focus().toggleItalic().run())} aria-label="Italic">
        <em>I</em>
      </button>
      <button type="button" onClick={() => runMarkCommand(() => editor.chain().focus().toggleStrike().run())} aria-label="Strikethrough">
        <s>S</s>
      </button>
      <button type="button" onClick={() => runMarkCommand(() => editor.chain().focus().toggleCode().run())} aria-label="Inline code">
        &lt;&gt;
      </button>
      <button
        type="button"
        onClick={() => {
          setLinkHref(editor.getAttributes("link").href ?? "");
          setLinkOpen((current) => !current);
        }}
        aria-label="Link"
      >
        Link
      </button>
      {linkOpen ? (
        <form
          className="document-editor-link-popover"
          onSubmit={(event) => {
            event.preventDefault();
            if (linkHref.trim()) {
              editor.chain().focus().setLink({ href: linkHref.trim() }).run();
            } else {
              editor.chain().focus().unsetLink().run();
            }
            setLinkOpen(false);
          }}
        >
          <input
            autoFocus
            value={linkHref}
            onChange={(event) => setLinkHref(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setLinkOpen(false);
                editor.commands.focus();
              }
            }}
            placeholder="https://example.com"
            aria-label="Link URL"
          />
        </form>
      ) : null}
    </div>
  );
}
