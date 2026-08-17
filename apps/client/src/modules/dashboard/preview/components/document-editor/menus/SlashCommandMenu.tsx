"use client";

import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/core";

import { findEditorCommands, type EditorCommand } from "../commands/editorCommands";

type SlashMenuState = {
  from: number;
  to: number;
  query: string;
  index: number;
  top: number;
  left: number;
};

function getSlashMenuState(editor: Editor): SlashMenuState | null {
  if (!editor.isFocused || !editor.state.selection.empty) {
    return null;
  }

  const { $from } = editor.state.selection;

  if (!$from.parent.isTextblock) {
    return null;
  }

  const textBefore = $from.parent.textBetween(0, $from.parentOffset, "\n", "\n");
  const match = textBefore.match(/(?:^|\s)\/([\w-]*)$/);

  if (!match) {
    return null;
  }

  const slashOffset = match[0].lastIndexOf("/");
  const from = $from.pos - (match[0].length - slashOffset);
  const rect = editor.view.coordsAtPos($from.pos);

  return {
    from,
    to: $from.pos,
    query: match[1],
    index: 0,
    top: rect.bottom + 8,
    left: rect.left,
  };
}

function clampMenuPosition(top: number, left: number) {
  const width = Math.min(300, window.innerWidth - 16);
  const estimatedHeight = 360;
  const nextLeft = Math.min(Math.max(8, left), window.innerWidth - width - 8);
  const nextTop =
    top + estimatedHeight <= window.innerHeight
      ? top
      : Math.max(8, top - estimatedHeight - 32);

  return { top: nextTop, left: nextLeft, width };
}

export function SlashCommandMenu({ editor }: { editor: Editor }) {
  const [menuState, setMenuState] = useState<SlashMenuState | null>(null);
  const commands = useMemo(
    () => (menuState ? findEditorCommands(menuState.query) : []),
    [menuState],
  );

  useEffect(() => {
    const update = () => {
      setMenuState((current) => {
        const next = getSlashMenuState(editor);

        if (!next) {
          return null;
        }

        return {
          ...next,
          index: Math.min(current?.index ?? 0, Math.max(0, findEditorCommands(next.query).length - 1)),
        };
      });
    };

    update();
    editor.on("update", update);
    editor.on("selectionUpdate", update);
    editor.on("focus", update);
    editor.on("blur", update);

    return () => {
      editor.off("update", update);
      editor.off("selectionUpdate", update);
      editor.off("focus", update);
      editor.off("blur", update);
    };
  }, [editor]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!menuState || commands.length === 0) {
        if (event.key === "Escape" && menuState) {
          setMenuState(null);
        }
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        const direction = event.key === "ArrowDown" ? 1 : -1;

        setMenuState((current) =>
          current
            ? {
                ...current,
                index:
                  (current.index + direction + commands.length) % commands.length,
              }
            : current,
        );
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        executeCommand(editor, commands[menuState.index], menuState);
        setMenuState(null);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setMenuState(null);
      }
    };

    editor.view.dom.addEventListener("keydown", handleKeyDown, true);

    return () => editor.view.dom.removeEventListener("keydown", handleKeyDown, true);
  }, [commands, editor, menuState]);

  if (!menuState) {
    return null;
  }

  const position = clampMenuPosition(menuState.top, menuState.left);

  return (
    <div
      role="listbox"
      aria-label="Editor commands"
      className="document-editor-slash-menu"
      style={{ top: position.top, left: position.left, width: position.width }}
    >
      <p className="document-editor-menu-label">Basic blocks</p>
      {commands.length === 0 ? (
        <p className="document-editor-menu-empty">No matching commands</p>
      ) : (
        commands.map((command, index) => (
          <button
            key={command.id}
            type="button"
            role="option"
            aria-selected={index === menuState.index}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              executeCommand(editor, command, menuState);
              setMenuState(null);
            }}
            className={`document-editor-menu-item ${index === menuState.index ? "document-editor-menu-item-active" : ""}`}
          >
            <span>
              <span className="document-editor-menu-item-title">{command.title}</span>
              <span className="document-editor-menu-item-description">
                {command.description}
              </span>
            </span>
          </button>
        ))
      )}
    </div>
  );
}

function executeCommand(
  editor: Editor,
  command: EditorCommand,
  menuState: SlashMenuState,
) {
  editor.chain().focus().deleteRange({ from: menuState.from, to: menuState.to }).run();
  command.execute(editor);
}
