// @vitest-environment jsdom

import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { documentEditorExtensions } from "./documentEditorExtensions";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function applyTextInput(text: string) {
  if (!editor) {
    return false;
  }

  const { from, to } = editor.state.selection;
  let handled = false;

  editor.view.someProp("handleTextInput", (handler) => {
    if (handler(editor!.view, from, to, text, () => editor!.state.tr)) {
      handled = true;
      return true;
    }

    return false;
  });

  if (!handled) {
    editor.view.dispatch(editor.state.tr.insertText(text, from, to));
  }

  return handled;
}

describe("Document editor input rules", () => {
  it.each([
    ["# ", "heading", 1],
    ["## ", "heading", 2],
    ["### ", "heading", 3],
    ["- ", "bulletList", undefined],
    ["1. ", "orderedList", undefined],
    ["> ", "blockquote", undefined],
    ["``` ", "codeBlock", undefined],
    ["[ ] ", "taskList", undefined],
  ])("converts %s into a semantic %s block", (trigger, type, level) => {
    editor = new Editor({ extensions: documentEditorExtensions });

    expect(applyTextInput(trigger)).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe(type);

    if (level) {
      expect(editor.getJSON().content?.[0]?.attrs?.level).toBe(level);
    }
  });

  it.each([
    ["**bold** ", "bold"],
    ["*italic* ", "italic"],
    ["~~strike~~ ", "strike"],
    ["`code` ", "code"],
  ])("converts %s into an inline %s mark", (input, mark) => {
    editor = new Editor({ extensions: documentEditorExtensions });

    for (const character of input) {
      applyTextInput(character);
    }

    const paragraph = editor.getJSON().content?.[0];
    const markedText = paragraph?.content?.find((item) => item.marks?.length);

    expect(markedText?.marks?.some((item) => item.type === mark)).toBe(true);
  });
});
